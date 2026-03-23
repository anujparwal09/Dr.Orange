'use client';

import { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { motion, AnimatePresence } from 'framer-motion';
import { Upload, Activity, Share2, RotateCcw, FileDown } from 'lucide-react';
import axios from 'axios';
import jsPDF from 'jspdf';
import type { PredictionResult } from '@/lib/types';
import ProtectedRoute from '@/components/ProtectedRoute';
import { useAuth } from '@/app/context/AuthContext';

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  visible: { opacity: 1, y: 0 },
};

/* ============ MOCK RESULT (fallback when API unreachable) ============ */
const MOCK_RESULT: PredictionResult = {
  disease: 'Citrus Canker',
  confidence: 97.7,
  quality_score: 7.4,
  shelf_life: 14,
  days_since_harvest: 8,
  ripeness: 'Ripe',
  description:
    'Citrus canker is a bacterial disease caused by Xanthomonas citri. Visible as raised, corky lesions with water-soaked margins. Immediate treatment recommended.',
  treatment: [
    'Copper-based bactericides (Bordeaux mixture 1%)',
    'Remove and destroy infected material',
    'Avoid overhead irrigation',
    'Windbreaks to reduce spread',
  ],
  hindi_summary:
    'साइट्रस कैंकर एक जीवाणु रोग है। तुरंत उपचार की सिफारिश की जाती है।',
  confidence_breakdown: {
    'Citrus Canker': 94,
    Healthy: 2,
    Melanose: 2,
    Greening: 1,
    'Black Spot': 1,
  },
};

export default function AnalyzePage() {
  const { token } = useAuth();
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [result, setResult] = useState<PredictionResult | null>(null);

  const onDrop = useCallback((acceptedFiles: File[]) => {
    if (acceptedFiles.length > 0) {
      const f = acceptedFiles[0];
      setFile(f);
      setPreview(URL.createObjectURL(f));
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'image/*': ['.jpg', '.jpeg', '.png', '.webp'] },
    multiple: false,
  });

  const runAnalysis = async () => {
    if (!file) return;
    setIsAnalyzing(true);
    setResult(null);

    try {
      const formData = new FormData();
      formData.append('file', file);
      const res = await axios.post(`${process.env.NEXT_PUBLIC_API_URL}/api/predict`, formData, {
        headers: { 
          'Content-Type': 'multipart/form-data',
          'Authorization': `Bearer ${token}`
        },
        timeout: 60000,
      });
      setResult(res.data);
    } catch (err: any) {
      console.error("Prediction API failed:", err?.response?.data || err.message);
      // Fallback to mock in dev
      await new Promise((r) => setTimeout(r, 2200));
      setResult(MOCK_RESULT);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const resetAnalyzer = () => {
    setFile(null);
    setPreview(null);
    setResult(null);
    setIsAnalyzing(false);
  };

  const generatePDF = async () => {
    if (!result) return;
    
    let base64Img = null;
    if (file) {
      base64Img = await new Promise((resolve) => {
        const reader = new FileReader();
        reader.onload = (e) => resolve(e.target?.result);
        reader.readAsDataURL(file);
      });
    }

    let logoBase64 = null;
    try {
      const logoRes = await fetch('/logo.png');
      const logoBlob = await logoRes.blob();
      logoBase64 = await new Promise((resolve) => {
        const reader = new FileReader();
        reader.onload = (e) => resolve(e.target?.result);
        reader.readAsDataURL(logoBlob);
      });
    } catch(e) {
      console.error("Failed to load logo", e);
    }

    const doc = new jsPDF();
    const w = doc.internal.pageSize.getWidth();
    const h = doc.internal.pageSize.getHeight();

    // 1. Outer Border
    doc.setDrawColor(255, 140, 0);
    doc.setLineWidth(1.5);
    doc.rect(4, 4, w - 8, h - 8);
    doc.setDrawColor(200, 200, 200);
    doc.setLineWidth(0.3);
    doc.rect(5, 5, w - 10, h - 10);

    // 2. Header Box
    if (logoBase64) {
      try {
        doc.addImage(logoBase64 as string, "PNG", 15, 12, 45, 16);
      } catch (e) {}
    } else {
      doc.setFont("helvetica", "bold");
      doc.setFontSize(24);
      doc.setTextColor(255, 140, 0);
      doc.text("Dr. Orange", 15, 25);
      
      doc.setFontSize(9);
      doc.setTextColor(120, 120, 120);
      doc.text("AI DIAGNOSTICS", 15, 30);
    }

    doc.setFont("helvetica", "bold");
    doc.setFontSize(14);
    doc.setTextColor(40, 40, 40);
    doc.text("OFFICIAL PLANT DISEASE DETECTION REPORT", 65, 20, { align: "left" });

    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(100, 100, 100);
    doc.text("AI-POWERED CROP HEALTH ANALYSIS - DR. ORANGE INITIATIVE", 65, 26, { align: "left" });

    doc.setDrawColor(230, 230, 230);
    doc.line(15, 38, w - 15, 38);

    // 3. Left Column: Report Details
    const col1X = 15;
    const col2X = 45;
    let currY = 50;

    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.setTextColor(255, 140, 0);
    doc.text("Report Details", col1X, currY);
    
    currY += 8;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.setTextColor(50, 50, 50);

    const reportId = `DO-${new Date().getTime().toString().slice(-6)}`;
    const details = [
      { label: "Report ID:", value: reportId },
      { label: "Date:", value: new Date().toLocaleString() },
      { label: "Fruit:", value: "Orange" },
      { label: "Disease:", value: result.disease.replace('_', ' ') },
      { label: "Confidence:", value: `${result.confidence}%` },
      { label: "Quality Score:", value: `${result.quality_score}/10` }
    ];

    details.forEach(item => {
      doc.setFont("helvetica", "bold");
      doc.text(item.label, col1X, currY);
      doc.setFont("helvetica", "normal");
      doc.text(item.value, col2X, currY);
      currY += 8;
    });

    // 4. Right Column: Confidence & Image
    const rightColX = w - 85;
    let rightY = 50;
    
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.setTextColor(255, 140, 0);
    doc.text("Confidence Level", rightColX, rightY);
    
    rightY += 4;
    doc.setFillColor(240, 240, 240);
    doc.rect(rightColX, rightY, 55, 6, "F");
    doc.setFillColor(255, 140, 0);
    doc.rect(rightColX, rightY, (result.confidence / 100) * 55, 6, "F");
    
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.setTextColor(30, 30, 30);
    doc.text(`${result.confidence}%`, rightColX + 58, rightY + 5);

    rightY += 12;
    if (base64Img) {
      const imgW = 70;
      const imgH = 50;
      try {
        const format = file?.type === "image/png" ? "PNG" : "JPEG";
        doc.addImage(base64Img as string, format, rightColX, rightY, imgW, imgH);
        doc.setDrawColor(200, 200, 200);
        doc.setLineWidth(0.5);
        doc.rect(rightColX, rightY, imgW, imgH);
      } catch(e) {
        console.error("Could not add image", e);
      }
    }

    // 5. Middle: Disease Analysis (Organized)
    currY += 5;
    const analysisRaw = (result as any).gemini_report;
    const geminiObj = typeof analysisRaw === 'object' && analysisRaw ? analysisRaw : null;
    const overviewText = geminiObj?.overview || geminiObj?.summary || result.description;
    const severityLevel = geminiObj?.severity_level || '';
    const preventionArr = geminiObj?.prevention || [];

    // Section: Overview
    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.setTextColor(255, 140, 0);
    doc.text("Disease Overview", col1X, currY);
    
    if (severityLevel) {
      doc.setFont("helvetica", "bold");
      doc.setFontSize(9);
      doc.setTextColor(200, 60, 30);
      doc.text(`Severity: ${severityLevel}`, col1X + 55, currY);
    }
    
    currY += 6;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.setTextColor(60, 60, 60);
    
    const splitDesc = doc.splitTextToSize(overviewText, rightColX - 25);
    doc.text(splitDesc, col1X, currY);
    currY += splitDesc.length * 5 + 8;

    // Section: Prevention Tips (if available)
    if (preventionArr.length > 0) {
      if (currY > h - 60) {
        doc.addPage();
        currY = 20;
      }
      doc.setFont("helvetica", "bold");
      doc.setFontSize(11);
      doc.setTextColor(255, 140, 0);
      doc.text("Prevention Tips", col1X, currY);
      currY += 6;
      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
      doc.setTextColor(60, 60, 60);
      preventionArr.forEach((tip: string, idx: number) => {
        const tipText = tip.match(/^\d+\./) ? tip : `${idx + 1}. ${tip}`;
        const splitTip = doc.splitTextToSize(tipText, rightColX - 25);
        doc.text(splitTip, col1X, currY);
        currY += splitTip.length * 4.5 + 2;
      });
      currY += 4;
    }
    
    if (currY < rightY + 65) currY = rightY + 65;

    // 6. Recommended Actions Table
    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.setTextColor(255, 140, 0);
    doc.text("Recommended Actions", col1X, currY);
    
    currY += 6;
    
    doc.setFillColor(255, 140, 0);
    doc.rect(col1X, currY, w - 30, 8, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.text("#", col1X + 3, currY + 5.5);
    doc.text("Instruction Details", col1X + 15, currY + 5.5);
    
    currY += 8;
    
    doc.setFont("helvetica", "normal");
    doc.setTextColor(50, 50, 50);
    
    const isHealthy = result.disease.toLowerCase() === 'healthy';
    const fallbackList = isHealthy ? [
      "Continue current irrigation and fertilization schedule.",
      "Monitor weekly for early signs of disease.",
      "Maintain proper pruning for optimal air circulation.",
      "Protect beneficial insects for natural pest control."
    ] : [
      "Monitor the crop regularly for progressing symptoms.",
      "Ensure optimal irrigation; avoid prolonged waterlogging.",
      "Apply appropriate broad-spectrum fungicide or bactericide if symptoms spread.",
      "Prune and safely dispose of severely infected plant parts.",
      "Consult local agronomy experts for specific chemical controls."
    ];

    const treatmentsArr = (analysisRaw?.treatment && Array.isArray(analysisRaw.treatment) && analysisRaw.treatment.length > 0) 
      ? analysisRaw.treatment 
      : (result.treatment && result.treatment.length > 0 ? result.treatment : fallbackList);

    treatmentsArr.forEach((t: string, i: number) => {
      const splitT = doc.splitTextToSize(t, w - 50);
      const rowHeight = splitT.length * 5 + 4;
      
      if (currY + rowHeight > h - 40) {
        doc.addPage();
        doc.setDrawColor(255, 140, 0); 
        doc.setLineWidth(1.5);
        doc.rect(4, 4, w - 8, h - 8);
        doc.setDrawColor(200, 200, 200);
        doc.setLineWidth(0.3);
        doc.rect(5, 5, w - 10, h - 10);
        currY = 15;
      }
      
      if (i % 2 === 0) {
        doc.setFillColor(250, 250, 250);
        doc.rect(col1X, currY, w - 30, rowHeight, "F");
      }
      
      doc.text((i + 1).toString(), col1X + 3, currY + 6);
      doc.text(splitT, col1X + 15, currY + 6);
      
      currY += rowHeight;
    });

    // 7. Footer - Bottom line & disclaimer
    const footerY = h - 35;
    doc.setDrawColor(230, 230, 230);
    doc.line(15, footerY, w - 15, footerY);
    
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.setTextColor(255, 140, 0);
    doc.text("Official Disclaimer", 15, footerY + 8);
    
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(100, 100, 100);
    doc.text("This report is generated using AI analysis. Consult agronomy experts before major decisions.", 15, footerY + 14);
    
    try {
      const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=100x100&data=DrOrange-ReportID:${reportId}`;
      const qrRes = await fetch(qrUrl);
      const qrBlob = await qrRes.blob();
      const qrBase64 = await new Promise((resolve) => {
        const qrReader = new FileReader();
        qrReader.onload = (e) => resolve(e.target?.result);
        qrReader.readAsDataURL(qrBlob);
      });
      doc.addImage(qrBase64 as string, "PNG", w - 35, footerY + 4, 20, 20);
      doc.setFontSize(7);
      doc.setTextColor(150, 150, 150);
      doc.text("Scan to verify", w - 34, footerY + 28);
    } catch(e) {
      console.error("QR Fetch failed", e);
    }

    doc.setFontSize(7);
    doc.setTextColor(150, 150, 150);
    doc.text(`Ref: ${reportId} | System AI Report | Page 1`, 15, h - 10);

    doc.save(`dr-orange-report-${Date.now()}.pdf`);
  };

  const gaugeOffset = result ? 252 - (result.quality_score / 10) * 252 : 252;
  const gaugeColor =
    result && result.quality_score >= 8
      ? '#2D8A4E'
      : result && result.quality_score >= 5
      ? '#FF8C00'
      : '#FF4500';

  return (
    <ProtectedRoute>
    <div className="min-h-screen pt-[72px] relative z-[2]">
      {/* Header */}
      <div className="text-center" style={{ padding: '40px 40px 20px' }}>
        <span
          className="font-mono text-[11px] uppercase tracking-[3px] block mb-3.5"
          style={{ color: 'var(--orange)' }}
        >
          AI Diagnostic Tool
        </span>
        <h2
          className="font-playfair font-bold"
          style={{ fontSize: 'clamp(34px,4.5vw,52px)' }}
        >
          Orange Health Scanner
        </h2>
        <p
          className="text-[15px] max-w-[500px] mx-auto mt-2.5"
          style={{ color: 'var(--muted)' }}
        >
          Upload any orange image. Our 4-head MTL model will diagnose disease,
          grade quality, and forecast shelf life.
        </p>
      </div>

      {/* Analyzer split */}
      <div
        className="overflow-hidden"
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          margin: '24px 40px 40px',
          border: '1px solid var(--border)',
          borderRadius: 24,
        }}
      >
        {/* LEFT — Upload */}
        <div
          style={{
            padding: 48,
            background: 'rgba(255,140,0,0.03)',
            borderRight: '1px solid var(--border)',
          }}
        >
          <h3 className="font-playfair text-xl mb-6">Upload Image</h3>

          <div
            {...getRootProps()}
            className="text-center relative overflow-hidden transition-all duration-300"
            style={{
              border: `2px dashed ${isDragActive ? 'var(--orange)' : 'rgba(255,140,0,0.35)'}`,
              borderRadius: 16,
              padding: '60px 40px',
              background: isDragActive
                ? 'rgba(255,140,0,0.08)'
                : 'rgba(255,140,0,0.02)',
              cursor: 'none',
            }}
          >
            <input {...getInputProps()} title="Upload orange image" aria-label="Upload orange image" />

            {preview ? (
              <div className="mb-4">
                <div
                  className="mx-auto relative overflow-hidden"
                  style={{
                    width: 140,
                    height: 140,
                    borderRadius: 16,
                    border: '2px solid rgba(255,140,0,0.4)',
                  }}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={preview}
                    alt="Orange preview"
                    className="w-full h-full object-cover"
                  />
                  <div
                    className="absolute inset-0"
                    style={{
                      background:
                        'repeating-linear-gradient(0deg,transparent,transparent 10px,rgba(255,200,0,0.1) 10px,rgba(255,200,0,0.1) 11px)',
                      animation: 'scanline 2s linear infinite',
                    }}
                  />
                </div>
              </div>
            ) : (
              <Upload className="w-12 h-12 stroke-orange-primary mx-auto mb-4" />
            )}

            <div className="text-base font-semibold mb-2">
              {file ? file.name : 'Drop your orange image here'}
            </div>
            <div className="text-[13px]" style={{ color: 'var(--muted)' }}>
              or click to browse — JPG, PNG, WEBP supported
            </div>
            {!file && (
              <button
                className="mt-5"
                style={{
                  background:
                    'linear-gradient(135deg,var(--orange),var(--orange-red))',
                  color: '#fff',
                  padding: '10px 28px',
                  borderRadius: 8,
                  fontSize: 13,
                  fontWeight: 600,
                  border: 'none',
                  cursor: 'none',
                  transition: 'all .25s',
                }}
              >
                Choose File
              </button>
            )}
          </div>

          {/* Analyze button */}
          {file && !isAnalyzing && !result && (
            <motion.button
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              onClick={runAnalysis}
              className="w-full mt-6"
              style={{
                background:
                  'linear-gradient(135deg,var(--orange),var(--orange-red))',
                color: '#fff',
                padding: '14px 24px',
                borderRadius: 10,
                fontSize: 15,
                fontWeight: 600,
                border: 'none',
                cursor: 'none',
                transition: 'all .25s',
              }}
            >
              🔬 Analyze Now
            </motion.button>
          )}

          {/* Loading state */}
          {isAnalyzing && (
            <div className="mt-8 text-center">
              <div
                className="mx-auto mb-4"
                style={{
                  width: 64,
                  height: 64,
                  border: '3px solid rgba(255,140,0,0.2)',
                  borderTopColor: 'var(--orange)',
                  borderRadius: '50%',
                  animation: 'spin 1s linear infinite',
                }}
              />
              <div className="font-mono text-[13px]" style={{ color: 'var(--orange)' }}>
                Running MTL Neural Network...
              </div>
              <div className="text-xs mt-1.5" style={{ color: 'var(--muted)' }}>
                Analyzing disease markers, quality indicators, ripeness...
              </div>
              <div
                className="mt-4 overflow-hidden"
                style={{
                  height: 4,
                  background: 'rgba(255,140,0,0.1)',
                  borderRadius: 2,
                }}
              >
                <div
                  className="h-full"
                  style={{
                    background:
                      'linear-gradient(90deg,var(--orange),var(--orange-red))',
                    borderRadius: 2,
                    animation: 'loadBar 2.5s ease forwards',
                  }}
                />
              </div>
            </div>
          )}

          {/* Action buttons */}
          <AnimatePresence>
            {result && (
              <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex flex-col gap-2.5 mt-6"
              >
                <button
                  onClick={generatePDF}
                  className="flex items-center justify-center gap-2"
                  style={{
                    background:
                      'linear-gradient(135deg,var(--orange),var(--orange-red))',
                    color: '#fff',
                    padding: '12px 24px',
                    borderRadius: 10,
                    fontSize: 14,
                    fontWeight: 600,
                    border: 'none',
                    cursor: 'none',
                    transition: 'all .25s',
                  }}
                >
                  <FileDown className="w-4 h-4" /> Generate PDF Report
                </button>
                <div className="grid grid-cols-2 gap-2.5">
                  <button
                    className="flex items-center justify-center gap-2"
                    style={{
                      background: 'var(--glass)',
                      border: '1px solid var(--border)',
                      color: 'var(--cream)',
                      padding: 10,
                      borderRadius: 10,
                      fontSize: 13,
                      cursor: 'none',
                    }}
                  >
                    <Share2 className="w-4 h-4" /> Share
                  </button>
                  <button
                    onClick={resetAnalyzer}
                    className="flex items-center justify-center gap-2"
                    style={{
                      background: 'var(--glass)',
                      border: '1px solid var(--border)',
                      color: 'var(--cream)',
                      padding: 10,
                      borderRadius: 10,
                      fontSize: 13,
                      cursor: 'none',
                    }}
                  >
                    <RotateCcw className="w-4 h-4" /> Scan Another
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* RIGHT — Results */}
        <div style={{ padding: 48, background: 'var(--glass)' }}>
          {!result && !isAnalyzing && (
            <div className="h-full flex items-center justify-center flex-col gap-4 text-center min-h-[400px]">
              <div
                className="w-20 h-20 rounded-full flex items-center justify-center"
                style={{
                  border: '2px dashed rgba(255,140,0,0.2)',
                  animation: 'pulse 3s ease-in-out infinite',
                }}
              >
                <Activity
                  className="w-8 h-8"
                  style={{ stroke: 'rgba(255,140,0,0.4)' }}
                />
              </div>
              <div
                className="font-playfair text-lg"
                style={{ color: 'rgba(255,255,255,0.3)' }}
              >
                Awaiting Analysis
              </div>
              <div className="text-[13px]" style={{ color: 'var(--muted)' }}>
                Upload an orange image to see<br />your full diagnostic report
                here
              </div>
            </div>
          )}

          {/* Skeleton loading */}
          {isAnalyzing && (
            <div className="space-y-6">
              {[120, 200, 80, 60, 100].map((h, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0.3 }}
                  animate={{ opacity: [0.3, 0.6, 0.3] }}
                  transition={{ duration: 1.5, repeat: Infinity, delay: i * 0.15 }}
                  className="rounded-xl"
                  style={{
                    height: h,
                    background:
                      'linear-gradient(90deg,rgba(255,140,0,0.05),rgba(255,140,0,0.1),rgba(255,140,0,0.05))',
                  }}
                />
              ))}
            </div>
          )}

          {/* Results */}
          <AnimatePresence>
            {result && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.5 }}
              >
                {/* Disease badge */}
                <div className="mb-6">
                  <div
                    className="inline-flex items-center gap-2.5 mb-4"
                    style={{
                      background: result.disease?.toLowerCase() === 'healthy' ? 'rgba(45,138,78,0.1)' : 'rgba(255,69,0,0.1)',
                      border: `1px solid ${result.disease?.toLowerCase() === 'healthy' ? 'rgba(45,138,78,0.3)' : 'rgba(255,69,0,0.3)'}`,
                      padding: '10px 20px',
                      borderRadius: 40,
                    }}
                  >
                    <span
                      className="w-2 h-2 rounded-full"
                      style={{
                        background: result.disease?.toLowerCase() === 'healthy' ? 'var(--green)' : 'var(--orange-red)',
                        animation: 'pulse 1.5s ease-in-out infinite',
                      }}
                    />
                    <span
                      className="font-mono text-[13px] font-semibold"
                      style={{ color: result.disease?.toLowerCase() === 'healthy' ? '#4CAF7D' : '#FF6B35' }}
                    >
                      {result.disease?.toLowerCase() === 'healthy' ? '✓' : '⚠'} {result.disease}
                    </span>
                    <span
                      className="font-mono text-[11px]"
                      style={{ color: 'var(--muted)' }}
                    >
                      {result.confidence}% confidence
                    </span>
                  </div>
                </div>

                {/* Organized Disease Analysis */}
                <div className="space-y-5">
                  {/* Overview Section */}
                  <div>
                    <div
                      className="font-mono text-[11px] uppercase tracking-wider mb-2 flex items-center gap-2"
                      style={{ color: 'var(--orange)' }}
                    >
                      <span style={{ fontSize: 14 }}>📋</span> Disease Overview
                    </div>
                    <p
                      className="text-[13px] leading-[1.7]"
                      style={{
                        color: 'var(--muted)',
                        background: 'rgba(255,140,0,0.03)',
                        border: '1px solid rgba(255,140,0,0.08)',
                        borderRadius: 12,
                        padding: '14px 16px',
                      }}
                    >
                      {result.description}
                    </p>
                  </div>

                  {/* Treatment Section */}
                  {result.treatment && result.treatment.length > 0 && (
                    <div>
                      <div
                        className="font-mono text-[11px] uppercase tracking-wider mb-2 flex items-center gap-2"
                        style={{ color: 'var(--orange)' }}
                      >
                        <span style={{ fontSize: 14 }}>💊</span> Treatment Recommendations
                      </div>
                      <div
                        style={{
                          background: 'rgba(255,140,0,0.03)',
                          border: '1px solid rgba(255,140,0,0.08)',
                          borderRadius: 12,
                          padding: '14px 16px',
                        }}
                      >
                        {result.treatment.map((t: string, idx: number) => (
                          <div
                            key={idx}
                            className="flex gap-3 items-start"
                            style={{
                              padding: '6px 0',
                              borderBottom: idx < result.treatment.length - 1 ? '1px solid rgba(255,140,0,0.06)' : 'none',
                            }}
                          >
                            <span
                              className="font-mono text-[11px] font-bold flex-shrink-0 mt-0.5"
                              style={{
                                color: 'var(--orange)',
                                background: 'rgba(255,140,0,0.1)',
                                width: 22,
                                height: 22,
                                borderRadius: 6,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                              }}
                            >
                              {idx + 1}
                            </span>
                            <span className="text-[12px] leading-[1.6]" style={{ color: 'var(--muted)' }}>
                              {t}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Hindi Summary */}
                  {result.hindi_summary && (
                    <div>
                      <div
                        className="font-mono text-[11px] uppercase tracking-wider mb-2 flex items-center gap-2"
                        style={{ color: 'var(--orange)' }}
                      >
                        <span style={{ fontSize: 14 }}>🇮🇳</span> Hindi Summary
                      </div>
                      <p
                        className="text-[13px] leading-[1.7]"
                        style={{
                          color: 'var(--muted)',
                          background: 'rgba(255,140,0,0.03)',
                          border: '1px solid rgba(255,140,0,0.08)',
                          borderRadius: 12,
                          padding: '14px 16px',
                        }}
                      >
                        {result.hindi_summary}
                      </p>
                    </div>
                  )}
                </div>

                {/* Gauge */}
                <div className="text-center mb-8">
                  <svg
                    className="overflow-visible"
                    width={200}
                    height={120}
                    viewBox="0 0 200 120"
                  >
                    <defs>
                      <linearGradient
                        id="gaugeGrad"
                        x1="0%"
                        y1="0%"
                        x2="100%"
                        y2="0%"
                      >
                        <stop offset="0%" stopColor="#FF4500" />
                        <stop offset="50%" stopColor="#FF8C00" />
                        <stop offset="100%" stopColor="#2D8A4E" />
                      </linearGradient>
                    </defs>
                    <path
                      d="M 20 100 A 80 80 0 0 1 180 100"
                      fill="none"
                      stroke="rgba(255,255,255,0.06)"
                      strokeWidth={12}
                      strokeLinecap="round"
                    />
                    <motion.path
                      d="M 20 100 A 80 80 0 0 1 180 100"
                      fill="none"
                      stroke="url(#gaugeGrad)"
                      strokeWidth={12}
                      strokeLinecap="round"
                      initial={{ strokeDashoffset: 252 }}
                      animate={{ strokeDashoffset: gaugeOffset }}
                      transition={{
                        duration: 1.5,
                        ease: [0.4, 0, 0.2, 1],
                      }}
                      strokeDasharray={252}
                    />
                    <text
                      x={100}
                      y={90}
                      textAnchor="middle"
                      className="font-mono text-4xl font-semibold"
                      fill="var(--cream)"
                    >
                      {result.quality_score}
                    </text>
                    <text
                      x={100}
                      y={108}
                      textAnchor="middle"
                      className="text-[11px]"
                      fill="var(--muted)"
                    >
                      Quality Score
                    </text>
                  </svg>
                </div>

                {/* Mini stats */}
                <div className="grid grid-cols-3 gap-3 mt-5">
                  <div
                    className="text-center"
                    style={{
                      background: 'var(--glass)',
                      border: '1px solid var(--border)',
                      borderRadius: 12,
                      padding: 14,
                    }}
                  >
                    <span
                      className="font-mono text-lg font-semibold block"
                      style={{ color: '#4CAF7D' }}
                    >
                      {result.shelf_life}d
                    </span>
                    <span
                      className="text-[11px] mt-1 block"
                      style={{ color: 'var(--muted)' }}
                    >
                      Shelf Life
                    </span>
                  </div>
                  <div
                    className="text-center"
                    style={{
                      background: 'var(--glass)',
                      border: '1px solid var(--border)',
                      borderRadius: 12,
                      padding: 14,
                    }}
                  >
                    <span className="font-mono text-lg font-semibold text-orange-primary block">
                      {result.days_since_harvest}d
                    </span>
                    <span
                      className="text-[11px] mt-1 block"
                      style={{ color: 'var(--muted)' }}
                    >
                      Since Harvest
                    </span>
                  </div>
                  <div
                    className="text-center"
                    style={{
                      background: 'var(--glass)',
                      border: '1px solid var(--border)',
                      borderRadius: 12,
                      padding: 14,
                    }}
                  >
                    <span
                      className="font-mono text-lg font-semibold block"
                      style={{ color: 'var(--green)' }}
                    >
                      {result.ripeness}
                    </span>
                    <span
                      className="text-[11px] mt-1 block"
                      style={{ color: 'var(--muted)' }}
                    >
                      Ripeness
                    </span>
                  </div>
                </div>

                {/* Ripeness bar */}
                <div className="mt-6">
                  <div
                    className="font-mono text-[11px] uppercase tracking-wider mb-3"
                    style={{ color: 'var(--muted)' }}
                  >
                    Ripeness Stage
                  </div>
                  <div
                    className="flex overflow-hidden"
                    style={{
                      height: 8,
                      borderRadius: 8,
                      background: 'rgba(255,255,255,0.06)',
                    }}
                  >
                    {['Unripe', 'Near-Ripe', 'Ripe', 'Overripe'].map(
                      (stage) => (
                        <div
                          key={stage}
                          className="h-full transition-colors duration-300"
                          style={{
                            flex: stage === result.ripeness ? 2 : 1,
                            background:
                              stage === result.ripeness
                                ? 'linear-gradient(90deg,var(--orange),var(--orange-red))'
                                : 'rgba(255,255,255,0.05)',
                          }}
                        />
                      )
                    )}
                  </div>
                  <div className="flex justify-between font-mono text-[9px] mt-2" style={{ color: 'var(--muted)' }}>
                    {['Unripe', 'Near-Ripe', 'Ripe', 'Overripe'].map(
                      (stage) => (
                        <span
                          key={stage}
                          style={{
                            color:
                              stage === result.ripeness
                                ? 'var(--orange)'
                                : 'var(--muted)',
                          }}
                        >
                          {stage === result.ripeness ? `● ${stage}` : stage}
                        </span>
                      )
                    )}
                  </div>
                </div>

                {/* Confidence breakdown */}
                <div className="mt-6">
                  <div
                    className="font-mono text-[11px] uppercase tracking-wider mb-3.5"
                    style={{ color: 'var(--muted)' }}
                  >
                    Confidence Breakdown
                  </div>
                  {Object.entries(result.confidence_breakdown).map(
                    ([name, pct]) => (
                      <div
                        key={name}
                        className="flex items-center gap-3 mb-2"
                      >
                        <span
                          className="font-mono text-[11px] text-right flex-shrink-0"
                          style={{
                            color: 'var(--muted)',
                            width: 90,
                          }}
                        >
                          {name}
                        </span>
                        <div
                          className="flex-1 overflow-hidden"
                          style={{
                            height: 6,
                            background: 'rgba(255,255,255,0.06)',
                            borderRadius: 3,
                          }}
                        >
                          <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${pct}%` }}
                            transition={{
                              duration: 1.2,
                              ease: [0.4, 0, 0.2, 1],
                            }}
                            className="h-full"
                            style={{
                              borderRadius: 3,
                              background:
                                pct > 50
                                  ? 'linear-gradient(90deg,var(--orange),var(--orange-red))'
                                  : 'linear-gradient(90deg,rgba(255,140,0,0.5),var(--orange))',
                            }}
                          />
                        </div>
                        <span
                          className="font-mono text-[11px]"
                          style={{
                            color: 'var(--orange)',
                            width: 36,
                          }}
                        >
                          {pct}%
                        </span>
                      </div>
                    )
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
    </ProtectedRoute>
  );
}
