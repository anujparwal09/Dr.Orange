'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, AlertTriangle, CheckCircle, Sun, X } from 'lucide-react';
import {
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from 'recharts';
import axios from 'axios';
import ProtectedRoute from '@/components/ProtectedRoute';
import { useAuth } from '@/app/context/AuthContext';

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  visible: { opacity: 1, y: 0 },
};

const fadeX = {
  hidden: { opacity: 0, x: -12 },
  visible: { opacity: 1, x: 0 },
};

const defaultStatCards = [
  { icon: <Search className="w-5 h-5 stroke-orange-primary" />, value: '0', label: 'Total Scans', delta: '', deltaColor: 'var(--green)' },
  { icon: <AlertTriangle className="w-5 h-5 stroke-orange-primary" />, value: '0', label: 'Diseases Found', delta: '', deltaColor: '#FF8C00' },
  { icon: <CheckCircle className="w-5 h-5 stroke-orange-primary" />, value: '0', label: 'Healthy Oranges', delta: '', deltaColor: 'var(--green)' },
  { icon: <Sun className="w-5 h-5 stroke-orange-primary" />, value: '0.0', label: 'Avg Quality Score', delta: '', deltaColor: 'var(--green)' },
];

const defaultDonutData = [
  { name: 'Healthy', value: 100, color: '#2D8A4E' }
];

const defaultHistoryRows: any[] = [];

const diseaseStyles: Record<string, { bg: string; color: string; border: string; symbol: string }> = {
  canker: { bg: 'rgba(255,69,0,0.1)', color: '#FF6B35', border: 'rgba(255,69,0,0.25)', symbol: '⚠' },
  healthy: { bg: 'rgba(45,138,78,0.1)', color: '#4CAF7D', border: 'rgba(45,138,78,0.25)', symbol: '✓' },
  melanose: { bg: 'rgba(255,140,0,0.1)', color: 'var(--orange)', border: 'rgba(255,140,0,0.25)', symbol: '~' },
};

/* eslint-disable @typescript-eslint/no-explicit-any */
function CustomTooltip({ active, payload, label }: any) {
  if (active && payload && payload.length) {
    return (
      <div
        className="font-mono text-xs"
        style={{
          background: 'rgba(7,7,7,0.95)',
          backdropFilter: 'blur(12px)',
          border: '1px solid var(--border)',
          borderRadius: 10,
          padding: '10px 14px',
          color: 'var(--cream)',
        }}
      >
        <div style={{ color: 'var(--muted)' }}>{label}</div>
        <div className="font-semibold mt-1" style={{ color: 'var(--orange)' }}>
          Score: {payload[0].value}
        </div>
      </div>
    );
  }
  return null;
}

export default function DashboardPage() {
  const { token } = useAuth();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState(defaultStatCards);
  const [donut, setDonut] = useState(defaultDonutData);
  const [history, setHistory] = useState(defaultHistoryRows);
  const [qData, setQData] = useState<any[]>([]);
  const [selectedScan, setSelectedScan] = useState<any>(null);
  
  useEffect(() => {
    if (!token) return;
      const fetchData = async () => {
        try {
          const res = await axios.get('/api/history', {
            headers: { Authorization: `Bearer ${token}` }
          });
          const data = res.data;
          
          if (!data || !data.scans) return;
          
          const scans = data.scans;
          
          // Compute stats
          const total = data.total || scans.length;
          let diseases = 0;
          let healthy = 0;
          let qualitySum = 0;
          let diseaseCounts: Record<string, number> = {};
          
          scans.forEach((s: any) => {
             qualitySum += s.quality_score || 0;
             if (s.disease === 'Healthy') {
               healthy++;
             } else {
               diseases++;
             }
             diseaseCounts[s.disease] = (diseaseCounts[s.disease] || 0) + 1;
          });
          
          const avgQuality = total > 0 ? (qualitySum / total).toFixed(1) : '0.0';
          const healthyPercent = total > 0 ? ((healthy / total) * 100).toFixed(1) : '0';
          
          setStats([
            { icon: <Search className="w-5 h-5 stroke-orange-primary" />, value: total.toString(), label: 'Total Scans', delta: '', deltaColor: 'var(--green)' },
            { icon: <AlertTriangle className="w-5 h-5 stroke-orange-primary" />, value: diseases.toString(), label: 'Diseases Found', delta: '', deltaColor: '#FF8C00' },
            { icon: <CheckCircle className="w-5 h-5 stroke-orange-primary" />, value: healthy.toString(), label: 'Healthy Oranges', delta: `${healthyPercent}% healthy rate`, deltaColor: 'var(--green)' },
            { icon: <Sun className="w-5 h-5 stroke-orange-primary" />, value: avgQuality, label: 'Avg Quality Score', delta: '', deltaColor: 'var(--green)' },
          ]);
          
          // Donut
          const newDonut = Object.entries(diseaseCounts).map(([name, count]) => {
            let color = '#8A7F70'; // fallback
            if (name === 'Healthy') color = '#2D8A4E';
            if (name === 'Citrus Canker') color = '#FF4500';
            if (name === 'Melanose') color = '#FF8C00';
            return {
              name,
              value: Math.round(((count as number) / total) * 100),
              color
            };
          }).filter(d => d.value > 0);
          if (newDonut.length > 0) setDonut(newDonut);
          
          const reversed = [...scans].reverse();
          setQData(reversed.map((s, i) => ({ day: `${i+1}`, score: s.quality_score })));
          
          // History
          setHistory(scans.map((s: any) => {
            let dt = 'healthy';
            if ((s.disease || '').toLowerCase().includes('canker')) dt = 'canker';
            if ((s.disease || '').toLowerCase().includes('melanose')) dt = 'melanose';
            
            return {
              id: s.id,
              name: `Scan #${s.id}`,
              date: new Date(s.scanned_at || Date.now()).toLocaleString(),
              disease: s.disease,
              diseaseType: dt,
              quality: s.quality_score,
              shelf: `${s.shelf_life_days} days`,
              gradient: 'radial-gradient(circle at 40% 35%,#FFD580,#FF8C00 50%,#CC4400)',
              gemini_report: s.gemini_report
            };
          }));

        } catch (e) {
          console.error('Failed to fetch history', e);
        } finally {
          setLoading(false);
        }
      };
      fetchData();
  }, [token]);
  
  const hPercent = donut.find((d: any) => d.name === 'Healthy')?.value || 0;

  return (
    <ProtectedRoute>
    <div className="min-h-screen pt-[72px] relative z-[2]">
      {/* Header */}
      <div style={{ padding: '40px 40px 0' }}>
        <span
          className="font-mono text-[11px] uppercase tracking-[3px] block mb-3.5"
          style={{ color: 'var(--orange)' }}
        >
          Analytics
        </span>
        <h2 className="font-playfair text-[32px] font-bold">Your Scan Dashboard</h2>
        <p className="text-sm mt-1.5" style={{ color: 'var(--muted)' }}>
          Track disease patterns, quality trends, and scan history across all your oranges.
        </p>
      </div>

      {/* Stat cards */}
      <div
        className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 relative z-[2]"
        style={{ padding: '32px 40px 0' }}
      >
        {stats.map((card: any, i: number) => (
          <motion.div
            key={i}
            variants={fadeUp}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            transition={{ delay: i * 0.1, duration: 0.7 }}
            whileHover={{ y: -2 }}
            className="relative overflow-hidden transition-all duration-300"
            style={{
              background: 'var(--glass)',
              border: '1px solid var(--border)',
              borderRadius: 16,
              padding: 24,
            }}
          >
            <div
              className="w-10 h-10 flex items-center justify-center mb-4"
              style={{
                borderRadius: 10,
                background: 'rgba(255,140,0,0.1)',
                border: '1px solid rgba(255,140,0,0.2)',
              }}
            >
              {card.icon}
            </div>
            <span className="font-mono text-[28px] font-semibold text-cream block">
              {card.value}
            </span>
            <span className="text-xs mt-1 block" style={{ color: 'var(--muted)' }}>
              {card.label}
            </span>
            <span
              className="font-mono text-[11px] mt-2 block"
              style={{ color: card.deltaColor }}
            >
              {card.delta}
            </span>
          </motion.div>
        ))}
      </div>

      {/* Charts */}
      <div
        className="grid grid-cols-1 lg:grid-cols-2 gap-6 relative z-[2]"
        style={{ padding: '24px 40px' }}
      >
        {/* Donut */}
        <div
          style={{
            background: 'var(--glass)',
            border: '1px solid var(--border)',
            borderRadius: 20,
            padding: 28,
          }}
        >
          <div className="font-playfair text-[17px] font-bold mb-5 text-cream">
            Disease Distribution
          </div>
          <div className="flex flex-col md:flex-row items-center gap-8">
            <PieChart width={140} height={140}>
              <Pie
                data={donut}
                cx={70}
                cy={70}
                innerRadius={39}
                outerRadius={61}
                dataKey="value"
                animationDuration={1200}
                stroke="none"
              >
                {donut.map((entry: any, i: number) => (
                  <Cell key={i} fill={entry.color} />
                ))}
              </Pie>
              <text x={70} y={66} textAnchor="middle" fill="#FAF5E4" fontFamily="JetBrains Mono,monospace" fontSize={18} fontWeight={600}>{hPercent}%</text>
              <text x={70} y={80} textAnchor="middle" fill="#8A7F70" fontSize={10}>Healthy</text>
            </PieChart>
            <div className="flex flex-col gap-2.5 flex-1">
              {donut.map((item: any) => (
                <div key={item.name} className="flex items-center gap-2.5">
                  <div
                    className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                    style={{ background: item.color }}
                  />
                  <span className="text-[13px]" style={{ color: 'var(--muted)' }}>
                    {item.name}
                  </span>
                  <span className="font-mono text-xs text-cream ml-auto">
                    {item.value}%
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Line chart */}
        <div
          style={{
            background: 'var(--glass)',
            border: '1px solid var(--border)',
            borderRadius: 20,
            padding: 28,
          }}
        >
          <div className="font-playfair text-[17px] font-bold mb-5 text-cream">
            Quality Score Trend
          </div>
          <ResponsiveContainer width="100%" height={180}>
            <LineChart data={qData}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,140,0,0.08)" />
              <XAxis
                dataKey="day"
                tick={{ fill: '#8A7F70', fontSize: 10, fontFamily: 'JetBrains Mono,monospace' }}
                axisLine={{ stroke: 'rgba(255,140,0,0.1)' }}
                tickLine={false}
              />
              <YAxis
                domain={[5, 10]}
                tick={{ fill: '#8A7F70', fontSize: 10, fontFamily: 'JetBrains Mono,monospace' }}
                axisLine={{ stroke: 'rgba(255,140,0,0.1)' }}
                tickLine={false}
              />
              <Tooltip content={<CustomTooltip />} />
              <Line
                type="monotone"
                dataKey="score"
                stroke="#FF8C00"
                strokeWidth={2.5}
                dot={{ fill: '#FF8C00', r: 4, stroke: '#070707', strokeWidth: 2 }}
                activeDot={{ r: 6, fill: '#FF8C00', stroke: '#070707', strokeWidth: 2 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* History table */}
      <div
        className="relative z-[2] overflow-hidden"
        style={{
          margin: '0 40px 40px',
          background: 'var(--glass)',
          border: '1px solid var(--border)',
          borderRadius: 20,
        }}
      >
        {/* Table header */}
        <div
          className="hidden md:grid items-center font-mono text-[11px] uppercase tracking-wider"
          style={{
            gridTemplateColumns: '60px 1fr 130px 100px 100px 120px',
            gap: 16,
            padding: '16px 24px',
            borderBottom: '1px solid var(--border)',
            color: 'var(--muted)',
          }}
        >
          <span>Image</span>
          <span>Date &amp; Info</span>
          <span>Disease</span>
          <span>Quality</span>
          <span>Shelf Life</span>
          <span>Actions</span>
        </div>

        {/* Rows */}
        {history.length === 0 ? (
           <div className="p-8 text-center text-[13px] text-muted-foreground" style={{ color: 'var(--muted)' }}>No scans found. Starts scanning!</div>
        ) : history.map((row: any, i: number) => {
          const ds = diseaseStyles[row.diseaseType] || diseaseStyles.healthy;
          return (
            <motion.div
              key={i}
              variants={fadeX}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true }}
              transition={{ delay: i * 0.08, duration: 0.5 }}
              className="grid items-center transition-colors duration-200"
              style={{
                gridTemplateColumns: '60px 1fr 130px 100px 100px 120px',
                gap: 16,
                padding: '16px 24px',
                borderBottom: '1px solid rgba(255,140,0,0.06)',
              }}
            >
              <div
                className="w-11 h-11 flex-shrink-0"
                style={{
                  borderRadius: 10,
                  background: row.gradient,
                  border: '1px solid rgba(255,140,0,0.2)',
                }}
              />
              <div>
                <div className="text-sm font-medium mb-1">{row.name}</div>
                <div className="font-mono text-xs" style={{ color: 'var(--muted)' }}>
                  {row.date}
                </div>
              </div>
              <span
                className="inline-flex items-center gap-1.5 font-mono text-[11px] font-semibold"
                style={{
                  background: ds.bg,
                  color: ds.color,
                  border: `1px solid ${ds.border}`,
                  padding: '3px 10px',
                  borderRadius: 20,
                  width: 'fit-content',
                }}
              >
                {ds.symbol} {row.disease}
              </span>
              <span
                className="font-mono text-sm font-semibold"
                style={{
                  color:
                    row.quality >= 8
                      ? 'var(--green)'
                      : row.quality >= 6
                      ? '#FF8C00'
                      : '#FF4500',
                }}
              >
                {row.quality}
              </span>
              <span
                className="font-mono text-xs"
                style={{
                  color:
                    row.diseaseType === 'healthy'
                      ? 'var(--green)'
                      : row.diseaseType === 'melanose'
                      ? '#FF8C00'
                      : 'var(--muted)',
                }}
              >
                {row.shelf}
              </span>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setSelectedScan(row)}
                  className="text-[11px] transition-all duration-200 hover:bg-[rgba(255,140,0,0.15)]"
                  style={{
                    background: 'rgba(255,140,0,0.08)',
                    border: '1px solid rgba(255,140,0,0.2)',
                    color: 'var(--orange)',
                    padding: '5px 12px',
                    borderRadius: 6,
                    cursor: 'pointer',
                  }}
                >
                  View Details
                </button>
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* View Scan Modal */}
      <AnimatePresence>
        {selectedScan && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 backdrop-blur-md bg-black/60"
            onClick={() => setSelectedScan(null)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="relative w-full max-w-lg overflow-y-auto max-h-[85vh] p-6 rounded-2xl shadow-2xl"
              style={{
                background: 'var(--glass)',
                border: '1px solid var(--border)',
                boxShadow: '0 25px 50px -12px rgba(255,140,0,0.15)'
              }}
            >
              <button
                type="button"
                aria-label="Close"
                onClick={() => setSelectedScan(null)}
                className="absolute top-4 right-4 flex items-center justify-center rounded-full hover:bg-[rgba(255,255,255,0.1)] transition-colors p-1"
              >
                <X className="w-5 h-5 text-[var(--muted)] hover:text-white" />
              </button>
              
              <h3 className="font-playfair text-2xl font-bold mb-1 text-cream pr-6">
                {selectedScan.name}
              </h3>
              <div className="inline-flex items-center gap-1.5 font-mono text-[11px] font-semibold mb-5 mt-2"
                   style={{
                     background: diseaseStyles[selectedScan.diseaseType]?.bg || diseaseStyles.healthy.bg,
                     color: diseaseStyles[selectedScan.diseaseType]?.color || diseaseStyles.healthy.color,
                     border: `1px solid ${diseaseStyles[selectedScan.diseaseType]?.border || diseaseStyles.healthy.border}`,
                     padding: '3px 10px',
                     borderRadius: 20,
                   }}>
                {diseaseStyles[selectedScan.diseaseType]?.symbol || '✓'} {selectedScan.disease}
              </div>
              
              <div className="grid grid-cols-2 gap-4 mb-6">
                <div style={{ background: 'rgba(0,0,0,0.2)', border: '1px solid rgba(255,140,0,0.1)' }} className="p-3 rounded-lg text-center">
                  <span className="text-[11px] uppercase tracking-wider text-[var(--muted)]">Quality Score</span>
                  <div className="font-mono text-xl mt-1 text-[var(--orange)]">{selectedScan.quality}<span className="text-xs text-[var(--muted)]">/ 10</span></div>
                </div>
                <div style={{ background: 'rgba(0,0,0,0.2)', border: '1px solid rgba(255,140,0,0.1)' }} className="p-3 rounded-lg text-center">
                  <span className="text-[11px] uppercase tracking-wider text-[var(--muted)]">Shelf Life</span>
                  <div className="font-mono text-xl mt-1 text-[var(--green)]">{selectedScan.shelf}</div>
                </div>
              </div>

              {selectedScan.gemini_report ? (
                <div className="space-y-5">
                  {/* AI Overview */}
                  <div>
                    <h4 className="text-[11px] font-semibold text-[var(--orange)] uppercase tracking-widest mb-1.5 border-b border-[rgba(255,140,0,0.1)] pb-1 flex items-center gap-2">
                      <span>📋</span> Disease Overview
                    </h4>
                    <p className="text-[13px] leading-relaxed mt-2" 
                       style={{ 
                         color: 'var(--muted)',
                         background: 'rgba(255,140,0,0.03)',
                         border: '1px solid rgba(255,140,0,0.08)',
                         borderRadius: 10,
                         padding: '12px 14px',
                       }}>
                      {typeof selectedScan.gemini_report === 'string' 
                        ? selectedScan.gemini_report 
                        : selectedScan.gemini_report.overview || "No advanced report available."}
                    </p>
                  </div>

                  {/* Treatment */}
                  {selectedScan.gemini_report.treatment && Array.isArray(selectedScan.gemini_report.treatment) && (
                    <div>
                      <h4 className="text-[11px] font-semibold text-[var(--orange)] uppercase tracking-widest mb-1.5 border-b border-[rgba(255,140,0,0.1)] pb-1 flex items-center gap-2">
                        <span>💊</span> Treatment Guidelines
                      </h4>
                      <div style={{ 
                        background: 'rgba(255,140,0,0.03)',
                        border: '1px solid rgba(255,140,0,0.08)',
                        borderRadius: 10,
                        padding: '10px 14px',
                      }}>
                        {selectedScan.gemini_report.treatment.map((t: string, idx: number) => (
                          <div key={idx} className="flex gap-2.5 items-start" style={{
                            padding: '5px 0',
                            borderBottom: idx < selectedScan.gemini_report.treatment.length - 1 
                              ? '1px solid rgba(255,140,0,0.06)' 
                              : 'none',
                          }}>
                            <span className="font-mono text-[10px] font-bold flex-shrink-0 mt-0.5"
                              style={{
                                color: 'var(--orange)',
                                background: 'rgba(255,140,0,0.1)',
                                width: 20, height: 20, borderRadius: 5,
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                              }}>
                              {idx + 1}
                            </span>
                            <span className="text-[12px] leading-snug" style={{ color: 'var(--muted)' }}>{t}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Prevention */}
                  {selectedScan.gemini_report.prevention && Array.isArray(selectedScan.gemini_report.prevention) && selectedScan.gemini_report.prevention.length > 0 && (
                    <div>
                      <h4 className="text-[11px] font-semibold text-[var(--orange)] uppercase tracking-widest mb-1.5 border-b border-[rgba(255,140,0,0.1)] pb-1 flex items-center gap-2">
                        <span>🛡️</span> Prevention Tips
                      </h4>
                      <div style={{ 
                        background: 'rgba(255,140,0,0.03)',
                        border: '1px solid rgba(255,140,0,0.08)',
                        borderRadius: 10,
                        padding: '10px 14px',
                      }}>
                        {selectedScan.gemini_report.prevention.map((p: string, idx: number) => (
                          <div key={idx} className="flex gap-2.5 items-start" style={{
                            padding: '5px 0',
                            borderBottom: idx < selectedScan.gemini_report.prevention.length - 1 
                              ? '1px solid rgba(255,140,0,0.06)' 
                              : 'none',
                          }}>
                            <span className="text-[11px]" style={{ color: 'var(--green)' }}>✓</span>
                            <span className="text-[12px] leading-snug" style={{ color: 'var(--muted)' }}>{p}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <p className="text-[13px] italic text-center p-4 border border-[rgba(255,255,255,0.05)] rounded-lg" style={{ color: 'var(--muted)' }}>
                  No advanced detailed report available for this scan (Standard AI model usage only).
                </p>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
    </ProtectedRoute>
  );
}
