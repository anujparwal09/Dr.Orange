'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Calendar, FileImage, AlertTriangle, CheckCircle } from 'lucide-react';
import axios from 'axios';
import ProtectedRoute from '@/components/ProtectedRoute';
import { useAuth } from '@/app/context/AuthContext';

interface Scan {
  id: number;
  disease: string;
  disease_confidence: number;
  quality_score: number;
  scanned_at: string;
  gemini_report?: any;
}

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  visible: { opacity: 1, y: 0 },
};

export default function HistoryPage() {
  const { token, isLoading: authLoading } = useAuth();
  const [scans, setScans] = useState<Scan[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (authLoading) {
      return;
    }
    
    if (token) {
      fetchScans();
    } else {
      setLoading(false);
    }
  }, [token, authLoading]);

  const fetchScans = async () => {
    try {
      const res = await axios.get('/api/history', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setScans(res.data.scans || []);
    } catch (err) {
      console.error('Failed to fetch scans', err);
    } finally {
      setLoading(false);
    }
  };

  const getDiseaseIcon = (disease: string) => {
    if (disease.toLowerCase().includes('healthy')) {
      return <CheckCircle className="w-5 h-5 text-green-500" />;
    }
    return <AlertTriangle className="w-5 h-5 text-orange-500" />;
  };

  const getDiseaseColor = (disease: string) => {
    if (disease.toLowerCase().includes('healthy')) {
      return 'text-green-400';
    }
    return 'text-orange-400';
  };

  return (
    <ProtectedRoute>
      <div className="relative z-[2] min-h-screen page-main-container">
        <div className="max-w-[1000px] mx-auto px-6">
          <motion.div initial="hidden" animate="visible" variants={fadeUp} className="mb-10">
            <h1 className="font-playfair text-4xl font-bold mb-3">My Scan History</h1>
            <p className="text-[var(--muted)]">View all your previous orange scans and results.</p>
          </motion.div>

          {loading ? (
            <div className="text-center text-[var(--muted)] py-20">Loading your scan history...</div>
          ) : scans.length === 0 ? (
            <div className="text-center py-20">
              <FileImage className="w-16 h-16 text-[var(--muted)] mx-auto mb-4" />
              <h3 className="text-xl font-semibold mb-2">No scans yet</h3>
              <p className="text-[var(--muted)]">Start by uploading an orange image to analyze.</p>
            </div>
          ) : (
            <div className="space-y-6">
              {scans.map((scan, index) => (
                <motion.div
                  key={scan.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className="bg-[var(--glass)] border border-[var(--border)] rounded-2xl p-6 hover:bg-[rgba(255,255,255,0.02)] transition-colors"
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      {getDiseaseIcon(scan.disease)}
                      <div>
                        <h3 className="font-semibold text-lg">{scan.disease}</h3>
                        <div className="flex items-center gap-2 text-sm text-[var(--muted)]">
                          <Calendar className="w-4 h-4" />
                          {new Date(scan.scanned_at).toLocaleDateString('en-US', {
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-2xl font-mono font-bold text-[var(--orange)]">
                        {scan.quality_score?.toFixed(1) || 'N/A'}
                      </div>
                      <div className="text-xs text-[var(--muted)]">Quality Score</div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                    <div>
                      <div className="text-sm text-[var(--muted)] mb-1">Disease Confidence</div>
                      <div className={`font-mono text-lg ${getDiseaseColor(scan.disease)}`}>
                        {scan.disease_confidence ? `${(scan.disease_confidence * 100).toFixed(1)}%` : 'N/A'}
                      </div>
                    </div>
                    <div>
                      <div className="text-sm text-[var(--muted)] mb-1">Scan ID</div>
                      <div className="font-mono text-lg">#{scan.id}</div>
                    </div>
                  </div>

                  {scan.gemini_report && (
                    <div className="border-t border-[var(--border)] pt-4 space-y-3">
                      <div className="text-[11px] font-semibold text-[var(--orange)] uppercase tracking-widest flex items-center gap-2">
                        <span>📋</span> AI Analysis Summary
                      </div>
                      <div className="text-[13px] leading-relaxed" 
                           style={{ 
                             color: 'var(--muted)',
                             background: 'rgba(255,140,0,0.03)',
                             border: '1px solid rgba(255,140,0,0.08)',
                             borderRadius: 10,
                             padding: '12px 14px',
                           }}>
                        {typeof scan.gemini_report === 'string' 
                          ? scan.gemini_report 
                          : scan.gemini_report?.overview || scan.gemini_report?.summary || 'Analysis available'
                        }
                      </div>
                      {typeof scan.gemini_report === 'object' && scan.gemini_report?.treatment && Array.isArray(scan.gemini_report.treatment) && (
                        <div className="flex items-center gap-2 text-[11px]" style={{ color: 'var(--muted)' }}>
                          <span style={{ color: 'var(--orange)' }}>💊</span>
                          {scan.gemini_report.treatment.length} treatment steps available
                          {scan.gemini_report.severity_level && (
                            <span className="ml-auto font-mono text-[10px] px-2 py-0.5 rounded-full"
                              style={{
                                background: scan.gemini_report.severity_level.toLowerCase() === 'low' ? 'rgba(45,138,78,0.15)' : 'rgba(255,69,0,0.15)',
                                color: scan.gemini_report.severity_level.toLowerCase() === 'low' ? '#4CAF7D' : '#FF6B35',
                                border: `1px solid ${scan.gemini_report.severity_level.toLowerCase() === 'low' ? 'rgba(45,138,78,0.3)' : 'rgba(255,69,0,0.3)'}`,
                              }}>
                              {scan.gemini_report.severity_level}
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </div>
    </ProtectedRoute>
  );
}