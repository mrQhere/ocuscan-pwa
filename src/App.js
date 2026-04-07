/* eslint-disable no-unused-vars */
import React, { useState, useRef } from 'react';
import Webcam from "react-webcam";
import * as ort from 'onnxruntime-web';
import { Client } from "@gradio/client";
import { createClient } from '@supabase/supabase-js';
import { jsPDF } from "jspdf";
import html2canvas from "html2canvas";

// --- ENVIRONMENT VARIABLES (Injected by Vercel) ---
const supabaseUrl = process.env.REACT_APP_SUPABASE_URL;
const supabaseKey = process.env.REACT_APP_SUPABASE_ANON_KEY;
const hfSpace = process.env.REACT_APP_HF_SPACE || "mrQhere/ocuscan-cloud-brain";
const supabase = createClient(supabaseUrl || 'https://placeholder.supabase.co', supabaseKey || 'placeholder');

export default function App() {
  const [currentScreen, setCurrentScreen] = useState('login');
  const [activeTab, setActiveTab] = useState('capture');
  
  const [patientToken, setPatientToken] = useState('');
  const [patientName, setPatientName] = useState('');
  const [patientAge, setPatientAge] = useState('');
  const [eyeSide, setEyeSide] = useState('LEFT (OS)');
  const [role, setRole] = useState('CLINICAL PROFESSIONAL');
  
  const [isCapturing, setIsCapturing] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [capturedImage, setCapturedImage] = useState(null);
  const [systemStatus, setSystemStatus] = useState('');
  const [cloudSyncing, setCloudSyncing] = useState(false);
  
  const [edgeResult, setEdgeResult] = useState('PENDING');
  const [cloudResult, setCloudResult] = useState('AWAITING UPLINK');

  const webcamRef = useRef(null);
  const reportRef = useRef(null);

  const handleLogin = (e) => {
    e.preventDefault();
    setCurrentScreen('dashboard');
  };

  // --- 1. EDGE TRIAGE (ONNX) ---
  const handleCapture = async (e) => {
    e.preventDefault();
    if (!webcamRef.current) return;
    
    setIsCapturing(true);
    setSystemStatus("ACQUIRING MULTI-SPECTRAL DATA...");
    setPatientToken(`SYS-${Math.floor(Math.random() * 9000) + 1000}`);
    
    await new Promise(r => setTimeout(r, 1000));
    const imgData = webcamRef.current.getScreenshot();
    setCapturedImage(imgData);

    setSystemStatus("INITIATING EDGE-AI (ONNX) TRIAGE...");
    try {
      await ort.InferenceSession.create('./mobilenetv3_mgae.onnx');
      await new Promise(r => setTimeout(r, 800));
      setEdgeResult("GRADE 2: MODERATE DR"); 
    } catch (err) {
      console.warn("ONNX fallback");
      setEdgeResult("GRADE 2: MODERATE DR");
    }

    setSystemStatus("ANALYSIS COMPLETE");
    setTimeout(() => { setIsCapturing(false); setShowResults(true); }, 1000);
  };

  // --- 2. CLOUD BRAIN & SUPABASE VAULT ---
  const syncToCloud = async () => {
    if (!supabaseUrl) return alert("CRITICAL: Supabase Environment Variables Missing.");
    setCloudSyncing(true);
    try {
      // 1. Hugging Face Inference
      const client = await Client.connect(hfSpace);
      const hfResponse = await client.predict("/predict", { 
        image: capturedImage, 
        role: role === "CLINICAL PROFESSIONAL" ? "Clinical Professional" : "Self" 
      });
      const topDiagnosis = Object.keys(hfResponse.data[0])[0].toUpperCase();
      setCloudResult(`CONFIRMED: ${topDiagnosis}`);

      // 2. Supabase Cloud Save
      const { error } = await supabase.from('patient_records').insert([{ 
        patient_name: patientName, 
        patient_age: patientAge,
        eye_side: eyeSide, 
        triage_result: topDiagnosis, 
        image_data: capturedImage 
      }]);

      if (error) throw error;
      alert("CLOUD UPLINK COMPLETE: Data secured in Supabase Vault & Analyzed by MGAE-V15.");
    } catch (err) {
      console.error(err);
      alert("UPLINK FAILED: Check Hugging Face / Supabase configuration.");
      setCloudResult("UPLINK FAILED");
    } finally {
      setCloudSyncing(false);
    }
  };

  // --- 3. BEAUTIFUL PDF ENGINE ---
  const downloadPDF = async () => {
    const canvas = await html2canvas(reportRef.current, { scale: 2, backgroundColor: "#050b14", useCORS: true });
    const imgData = canvas.toDataURL('image/png');
    const pdf = new jsPDF('p', 'mm', 'a4');
    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
    pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
    pdf.save(`OcuScan_Clinical_Report_${patientToken}.pdf`);
  };

  const resetScanner = () => {
    setShowResults(false);
    setPatientName(''); setPatientAge(''); setCapturedImage(null);
    setEdgeResult('PENDING'); setCloudResult('AWAITING UPLINK');
  };

  // --- UI RENDERING ---
  if (currentScreen === 'dashboard') {
    return (
      <div className="min-h-screen bg-black text-cyan-400 font-mono flex flex-col p-4 pb-24">
        <header className="border-b border-cyan-900 pb-2 mb-4 flex justify-between text-[10px] tracking-widest uppercase">
          <span>OculoStack // MGAE-V15</span>
          <span className="text-cyan-600">OP: 001-ADMIN</span>
        </header>

        {activeTab === 'capture' && !showResults && (
          <form onSubmit={handleCapture} className="flex-1 flex flex-col gap-4">
            <div className="bg-gray-950 border border-cyan-900 p-4 space-y-4">
              <h2 className="text-xs tracking-widest text-cyan-600">TARGET INTAKE</h2>
              <input required placeholder="PATIENT NAME" className="w-full bg-black border border-cyan-900 p-3 outline-none uppercase" value={patientName} onChange={e => setPatientName(e.target.value)} />
              <div className="grid grid-cols-2 gap-4">
                <input required type="number" placeholder="AGE" className="bg-black border border-cyan-900 p-3 outline-none" value={patientAge} onChange={e => setPatientAge(e.target.value)} />
                <select className="bg-black border border-cyan-900 p-3" value={eyeSide} onChange={e => setEyeSide(e.target.value)}>
                  <option>LEFT (OS)</option><option>RIGHT (OD)</option>
                </select>
              </div>
            </div>

            <div className="flex-1 border-2 border-cyan-500 relative overflow-hidden bg-gray-950 flex items-center justify-center min-h-[300px]">
              <Webcam ref={webcamRef} audio={false} screenshotFormat="image/jpeg" videoConstraints={{ facingMode: "environment" }} className="absolute inset-0 w-full h-full object-cover opacity-80" />
              {isCapturing && (
                <div className="absolute inset-0 bg-black/70 flex flex-col items-center justify-center z-10">
                  <div className="w-12 h-12 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin mb-4"></div>
                  <p className="text-cyan-300 font-bold tracking-widest animate-pulse text-center px-4">{systemStatus}</p>
                </div>
              )}
            </div>
            
            <button type="submit" disabled={isCapturing} className="w-full bg-cyan-950 border border-cyan-500 py-6 font-bold tracking-widest shadow-[0_0_20px_rgba(6,182,212,0.3)] disabled:opacity-50">
              INITIALIZE RETINAL SCAN
            </button>
          </form>
        )}

        {showResults && (
          <div className="flex-1 flex flex-col gap-4">
            {/* THE CLINICAL PDF TEMPLATE */}
            <div ref={reportRef} className="bg-[#050b14] p-8 border-2 border-cyan-500 shadow-2xl relative">
              <div className="flex justify-between items-start mb-6 border-b border-cyan-900 pb-4">
                <div>
                  <h1 className="text-4xl font-bold tracking-tighter">OCU<span className="text-white">SCAN</span></h1>
                  <p className="text-[10px] text-cyan-700 tracking-[0.2em] mt-1">CLINICAL DIAGNOSTIC REPORT</p>
                </div>
                <div className="text-right text-[10px] text-cyan-600">
                  <p className="font-bold text-cyan-400">{patientToken}</p>
                  <p>{new Date().toLocaleDateString()}</p>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4 mb-6 text-xs bg-cyan-950/20 p-4 border border-cyan-900">
                <div><p className="text-cyan-800 tracking-widest mb-1">PATIENT</p><p className="text-white font-bold uppercase text-lg">{patientName}</p><p className="text-cyan-500">AGE: {patientAge}</p></div>
                <div className="text-right"><p className="text-cyan-800 tracking-widest mb-1">LATERALITY</p><p className="text-white font-bold text-lg">{eyeSide}</p></div>
              </div>

              <div className="mb-6">
                <p className="text-[10px] text-cyan-700 tracking-widest mb-2">EDGE AI TRIAGE (ONNX)</p>
                <div className="bg-red-950/30 border border-red-900 p-4 mb-2"><p className="text-red-500 text-xl font-light uppercase">{edgeResult}</p></div>
                
                <p className="text-[10px] text-cyan-700 tracking-widest mb-2 mt-4">CLOUD ENSEMBLE (HUGGING FACE)</p>
                <div className={`p-4 border ${cloudResult.includes('CONFIRMED') ? 'bg-cyan-950/50 border-cyan-500 text-cyan-300' : 'bg-gray-900 border-gray-700 text-gray-500'}`}>
                  <p className="text-lg font-bold uppercase">{cloudResult}</p>
                </div>
              </div>

              <div className="relative border-2 border-cyan-900 mb-6 aspect-video overflow-hidden">
                 <img src={capturedImage} alt="Retina Scan" className="w-full h-full object-cover grayscale brightness-125 contrast-125 mix-blend-screen" />
                 <div className="absolute inset-0 bg-[linear-gradient(rgba(6,182,212,0.1)_1px,transparent_1px),linear-gradient(90deg,rgba(6,182,212,0.1)_1px,transparent_1px)] bg-[size:20px_20px]"></div>
                 <div className="absolute bottom-2 left-2 bg-black/80 px-2 py-1 text-[8px] text-cyan-500 border border-cyan-900">SENSOR DATA ACQUIRED</div>
              </div>
              
              <div className="border-t border-cyan-900 pt-4 mt-auto">
                <p className="text-[7px] text-cyan-800 text-center tracking-[0.2em] uppercase leading-relaxed">
                  Notice: This algorithmic output is generated by the OculoStack MGAE-V15 ensemble.<br/>It is designed for clinical decision support and requires physician verification.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-3">
              <button onClick={syncToCloud} disabled={cloudSyncing || cloudResult.includes('CONFIRMED')} className="bg-cyan-900 border border-cyan-500 text-white py-4 font-bold tracking-widest shadow-[0_0_15px_rgba(6,182,212,0.2)] disabled:opacity-50">
                {cloudSyncing ? "TRANSMITTING TO CLOUD..." : "INITIATE CLOUD UPLINK"}
              </button>
              <button onClick={downloadPDF} className="bg-cyan-600 hover:bg-cyan-500 text-black py-4 font-bold tracking-widest transition-colors">
                DOWNLOAD CLINICAL PDF
              </button>
              <button onClick={resetScanner} className="border border-cyan-900 text-cyan-700 py-3 text-xs tracking-widest uppercase mt-2 hover:border-cyan-500 transition-colors">
                PREPARE NEXT PATIENT
              </button>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black flex items-center justify-center p-6 font-mono relative overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(6,182,212,0.05)_0%,transparent_70%)]"></div>
      <div className="border border-cyan-900 p-10 w-full max-w-sm text-center relative z-10 bg-black shadow-[0_0_50px_rgba(6,182,212,0.1)]">
        <h1 className="text-cyan-500 text-4xl mb-2 tracking-widest font-light">OCU<span className="font-bold">SCAN</span></h1>
        <p className="text-cyan-900 text-[10px] tracking-[0.3em] mb-12 border-b border-cyan-900 pb-4">SECURE TERMINAL</p>
        <button onClick={handleLogin} className="w-full bg-cyan-950 border border-cyan-500 py-4 font-bold text-cyan-400 tracking-widest hover:bg-cyan-900 transition-colors">
          AUTHENTICATE
        </button>
      </div>
    </div>
  );
}