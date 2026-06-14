import React, { useCallback, useState, useEffect, useRef } from 'react'
import { useDropzone } from 'react-dropzone'

const Dashboard = () => {
  const [file, setFile] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadMessage, setUploadMessage] = useState("");
  const [pages, setPages] = useState([]);
  const [currentPageIndex, setCurrentPageIndex] = useState(0);
  const [isGeneratingAudio, setIsGeneratingAudio] = useState(false);
  
  // Speech Modes
  const [audioMode, setAudioMode] = useState("cloud"); // 'cloud' or 'local'
  const [errorMessage, setErrorMessage] = useState("");
  
  // Cloud TTS Voice Models
  const [voiceModel, setVoiceModel] = useState("en-US-Neural2-D");
  
  // Local Speech Synthesis Voice Models
  const [localVoices, setLocalVoices] = useState([]);
  const [selectedLocalVoice, setSelectedLocalVoice] = useState("");
  const [speechRate, setSpeechRate] = useState(1);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [shouldPlayCloud, setShouldPlayCloud] = useState(false);

  // Tracking refs for auto page progression
  const currentPageIndexRef = useRef(currentPageIndex);
  const ignoreNextEnd = useRef(false);

  useEffect(() => {
    currentPageIndexRef.current = currentPageIndex;
  }, [currentPageIndex]);

  const MAX_FILE_SIZE = 20 * 1024 * 1024; // 20 MB

  // Load browser's native voice engines
  useEffect(() => {
    const loadVoices = () => {
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        const voices = window.speechSynthesis.getVoices();
        // Filter for English voices by default, but display all
        const engVoices = voices.filter(v => v.lang.startsWith('en'));
        setLocalVoices(engVoices.length > 0 ? engVoices : voices);
        if (voices.length > 0 && !selectedLocalVoice) {
          const maleVoice = engVoices.find(v => 
            v.name.toLowerCase().includes('male') || 
            v.name.toLowerCase().includes('david') || 
            v.name.toLowerCase().includes('george') || 
            v.name.toLowerCase().includes('mark')
          ) || engVoices.find(v => v.name.includes('Google') || v.name.includes('Natural')) || engVoices[0] || voices[0];
          setSelectedLocalVoice(maleVoice.name);
        }
      }
    };

    loadVoices();
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      window.speechSynthesis.onvoiceschanged = loadVoices;
    }

    return () => {
      if (typeof window !== 'undefined' && window.speechSynthesis) {
        window.speechSynthesis.cancel();
      }
    };
  }, [selectedLocalVoice]);

  // Handle file drop
  const onDrop = useCallback((acceptedFiles) => {
    const pdf = acceptedFiles[0];
    setUploadMessage("");
    setErrorMessage("");

    if (!pdf) return;

    if (pdf.size > MAX_FILE_SIZE) {
      alert("File size must be less than 20 MB");
      setFile(null);
      return;
    }

    setFile(pdf);
  }, []);

  // Upload file to Express backend
  const handleUpload = async () => {
    if (!file) return;

    setIsUploading(true);
    setUploadMessage("");
    setErrorMessage("");
    setPages([]);
    setCurrentPageIndex(0);

    const formData = new FormData();
    formData.append("pdf", file);

    try {
      const response = await fetch("http://localhost:5000/api/upload", {
        method: "POST",
        body: formData,
      });

      const data = await response.json();

      if (response.ok) {
        setUploadMessage("✅ " + data.message);
        if (data.processResult && data.processResult.pages) {
          setPages(data.processResult.pages);
          setCurrentPageIndex(0);
          setShouldPlayCloud(false);
          
          if (audioMode === "cloud") {
            fetchAudioForPage(data.processResult.pages, 0);
          }
        }
      } else {
        setUploadMessage("❌ Upload failed: " + (data.error || "Unknown error"));
      }
    } catch (error) {
      console.error("Error uploading file:", error);
      setUploadMessage("❌ An error occurred during upload.");
    } finally {
      setIsUploading(false);
    }
  };

  // Convert text using browser speechSynthesis (Device mode)
  const speakLocalText = (text, voiceName = selectedLocalVoice, rate = speechRate) => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;
    
    window.speechSynthesis.cancel();
    if (!text) return;

    // Use a small timeout to allow the synthesis engine to clear its state 
    // and reset before speaking the new utterance. This resolves a known bug 
    // in Chromium/Safari where consecutive cancel() and speak() calls skip the first words.
    setTimeout(() => {
      const utterance = new SpeechSynthesisUtterance(text);
      const voice = localVoices.find(v => v.name === voiceName);
      if (voice) {
        utterance.voice = voice;
      }
      utterance.rate = rate;

      utterance.onstart = () => {
        setIsSpeaking(true);
        setIsPaused(false);
      };

      utterance.onend = () => {
        setIsSpeaking(false);
        setIsPaused(false);
        
        // Ignore if speech was manually interrupted/canceled
        if (ignoreNextEnd.current) {
          ignoreNextEnd.current = false;
          return;
        }

        // Automatically advance to the next page and continue speaking
        const nextIndex = currentPageIndexRef.current + 1;
        if (nextIndex < pages.length) {
          setTimeout(() => {
            goToPage(nextIndex, true);
          }, 300); // 300ms natural breathing space between pages
        }
      };

      utterance.onerror = () => {
        setIsSpeaking(false);
        setIsPaused(false);
        if (ignoreNextEnd.current) {
          ignoreNextEnd.current = false;
        }
      };

      window.speechSynthesis.speak(utterance);
    }, 250);
  };

  // Convert text using Google Cloud Text-to-Speech (Cloud mode)
  const fetchAudioForPage = async (currentPages, index, activeVoice = voiceModel) => {
    const page = currentPages[index];
    if (!page || page.audioUrl) return;

    setIsGeneratingAudio(true);
    setErrorMessage("");
    try {
      const response = await fetch("http://localhost:5000/api/tts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: page.text, pageNum: page.pageNum, voiceModel: activeVoice })
      });

      const data = await response.json();

      if (response.ok) {
        setPages(prevPages => {
          const newPages = [...prevPages];
          newPages[index] = { ...newPages[index], audioUrl: data.audioUrl };
          return newPages;
        });
      } else {
        // Handle API key errors by triggering the automatic browser synthesis fallback
        if (data.code === 'MISSING_API_KEY') {
          setErrorMessage("Google Cloud API Key is missing in backend/.env. Using browser speech synthesis instead.");
          setAudioMode("local");
          speakLocalText(page.text);
        } else {
          setErrorMessage("Failed to generate Google TTS audio. Falling back to local browser speech.");
          setAudioMode("local");
          speakLocalText(page.text);
        }
      }
    } catch (error) {
      console.error("Error generating audio:", error);
      setErrorMessage("Network error connecting to TTS backend. Falling back to local browser speech.");
      setAudioMode("local");
      speakLocalText(page.text);
    } finally {
      setIsGeneratingAudio(false);
    }
  };

  // Navigate pages
  const goToPage = (newIndex, autoPlayNext = false) => {
    if (typeof window !== 'undefined' && window.speechSynthesis && window.speechSynthesis.speaking) {
      ignoreNextEnd.current = true;
    }
    
    // Always stop current local synthesis
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
    setIsSpeaking(false);
    setIsPaused(false);
    
    setCurrentPageIndex(newIndex);
    if (audioMode === "cloud") {
      setShouldPlayCloud(autoPlayNext);
      fetchAudioForPage(pages, newIndex);
    } else {
      if (autoPlayNext) {
        speakLocalText(pages[newIndex].text);
      }
    }
  };

  // Switch Speech Mode
  const handleAudioModeChange = (mode) => {
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      ignoreNextEnd.current = true;
      window.speechSynthesis.cancel();
    }
    setIsSpeaking(false);
    setIsPaused(false);
    setAudioMode(mode);
    setErrorMessage("");
    setShouldPlayCloud(false);
    if (mode === "cloud") {
      fetchAudioForPage(pages, currentPageIndex);
    }
  };

  // Reset uploader
  const resetReader = () => {
    if (typeof window !== 'undefined' && window.speechSynthesis && window.speechSynthesis.speaking) {
      ignoreNextEnd.current = true;
    }
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
    setFile(null);
    setPages([]);
    setCurrentPageIndex(0);
    setUploadMessage("");
    setErrorMessage("");
    setIsSpeaking(false);
    setIsPaused(false);
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      "application/pdf": [".pdf"],
    },
    multiple: false,
  });

  return (
    <div className="min-h-[calc(100vh-80px)] py-12 px-4 sm:px-6 md:px-8 max-w-4xl mx-auto flex flex-col items-center justify-start">
      
      {/* Title Header */}
      <div className="text-center mb-10">
        <h1 className="text-3xl sm:text-5xl font-display font-extrabold text-white tracking-tight mb-3">
          Your Audiobook Dashboard
        </h1>
        <p className="text-slate-400 max-w-md mx-auto text-sm sm:text-base">
          Upload a PDF and listen to any page immediately with high-fidelity AI voice synthesis.
        </p>
      </div>

      {/* File Upload Section */}
      {pages.length === 0 && (
        <div className="w-full max-w-xl flex flex-col gap-6">
          <div
            {...getRootProps()}
            className={`w-full rounded-3xl border-2 border-dashed p-10 text-center cursor-pointer backdrop-blur-sm transition-all duration-300 ${
              isDragActive 
                ? 'border-indigo-500 bg-indigo-500/10 scale-[1.01]' 
                : 'border-slate-800 hover:border-slate-700 bg-slate-900/20 hover:bg-slate-900/30'
            }`}
          >
            <input {...getInputProps()} />
            
            <div className="w-16 h-16 rounded-2xl bg-indigo-500/10 flex items-center justify-center mx-auto mb-4 text-indigo-400">
              <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
              </svg>
            </div>
            
            <h3 className="text-lg font-bold text-white mb-1">
              {isDragActive ? "Drop PDF file here" : "Drag & Drop PDF here"}
            </h3>
            <p className="text-slate-500 text-sm mb-4">or click to browse from files</p>
            <span className="inline-block text-xs font-medium bg-slate-900 text-slate-400 py-1 px-3 rounded-full border border-slate-800">
              Maximum file size: 20 MB
            </span>
          </div>

          {file && (
            <div className="w-full p-6 rounded-3xl bg-slate-900/40 border border-white/5 backdrop-blur-md shadow-2xl flex flex-col gap-4">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-purple-500/10 flex items-center justify-center text-purple-400 shrink-0">
                  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
                <div className="overflow-hidden">
                  <h4 className="font-bold text-white truncate text-sm sm:text-base">{file.name}</h4>
                  <p className="text-slate-500 text-xs sm:text-sm">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
                </div>
              </div>
              
              <button 
                onClick={handleUpload}
                disabled={isUploading}
                className={`w-full py-4 rounded-2xl font-bold text-white shadow-lg shadow-indigo-500/10 hover:scale-[1.01] active:scale-[0.99] transition-all duration-300 ${
                  isUploading 
                    ? 'bg-slate-800 text-slate-500 cursor-not-allowed border border-white/5 animate-pulse' 
                    : 'bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700'
                }`}
              >
                {isUploading ? (
                  <span className="flex items-center justify-center gap-2">
                    <svg className="animate-spin h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Uploading & parsing PDF...
                  </span>
                ) : "Upload to Server"}
              </button>
              
              {uploadMessage && (
                <div className={`p-4 rounded-2xl text-sm font-semibold border ${
                  uploadMessage.startsWith("❌") 
                    ? 'bg-rose-500/10 border-rose-500/20 text-rose-400' 
                    : 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
                }`}>
                  {uploadMessage}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Book Reader Section */}
      {pages && pages.length > 0 && (
        <div className="w-full p-6 sm:p-8 rounded-3xl bg-slate-900/40 border border-white/5 backdrop-blur-xl shadow-2xl flex flex-col gap-6">
          
          {/* Fallback Error Notification */}
          {errorMessage && (
            <div className="p-4 rounded-2xl text-xs font-semibold bg-amber-500/10 border border-amber-500/20 text-amber-400 flex justify-between items-start gap-2 shadow-lg animate-pulse">
              <span>⚠️ {errorMessage}</span>
              <button onClick={() => setErrorMessage("")} className="text-amber-400 hover:text-white transition-colors shrink-0">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          )}

          {/* Reader Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/5 pb-5">
            <div>
              <div className="flex items-center gap-4">
                <div>
                  <span className="inline-flex items-center gap-1.5 px-3 py-1  bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-xs font-semibold">
                  Page {currentPageIndex + 1} of {pages.length}
                </span>
                </div>
                
                {/* Voice Mode Selector pills */}
                <div className="flex  bg-slate-950 p-0.5 border border-white/5">
                  <button
                    onClick={() => handleAudioModeChange("cloud")}
                    className={`px-3 py-1 text-[10px] font-bold uppercase transition-all ${
                      audioMode === "cloud"
                        ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/10"
                        : "text-slate-400 hover:text-slate-200"
                    }`}
                  >
                    Cloud AI
                  </button>
                  <button
                    onClick={() => handleAudioModeChange("local")}
                    className={`px-3 py-1 text-[10px] font-bold uppercase transition-all ${
                      audioMode === "local"
                        ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/10"
                        : "text-slate-400 hover:text-slate-200"
                    }`}
                  >
                    Device Voice
                  </button>
                </div>
              </div>
              
            </div>
          </div>

          {/* Reader Body Text */}
          <div className="relative min-h-[220px] max-h-[350px] overflow-y-auto p-6 bg-slate-950/40 border border-white/5 rounded-2xl">
            <p className="text-base sm:text-lg text-slate-300 leading-relaxed whitespace-pre-wrap font-light">
              {pages[currentPageIndex].text}
            </p>
          </div>

          {/* Audio Controls */}
          <div className="flex flex-col gap-4 border-t border-white/5 pt-5">
            {audioMode === "cloud" ? (
              isGeneratingAudio && !pages[currentPageIndex].audioUrl ? (
                <div className="flex flex-col items-center justify-center py-4 gap-2 bg-slate-950/20 rounded-2xl border border-white/5">
                  <div className="flex gap-1.5 items-center">
                    <span className="w-2.5 h-2.5 bg-indigo-500 rounded-full animate-bounce delay-0"></span>
                    <span className="w-2.5 h-2.5 bg-indigo-500 rounded-full animate-bounce delay-150"></span>
                    <span className="w-2.5 h-2.5 bg-indigo-500 rounded-full animate-bounce delay-300"></span>
                  </div>
                  <p className="text-indigo-400 font-semibold text-sm animate-pulse">
                    Synthesizing high-fidelity audio...
                  </p>
                </div>
              ) : (
                pages[currentPageIndex].audioUrl && (
                  <div className="w-full bg-slate-950/80 rounded-2xl p-4 border border-white/10 flex items-center justify-center">
                    <audio 
                      controls 
                      src={pages[currentPageIndex].audioUrl} 
                      className="w-full custom-audio"
                      autoPlay={shouldPlayCloud}
                      key={pages[currentPageIndex].audioUrl}
                      onEnded={() => {
                        if (currentPageIndex < pages.length - 1) {
                          goToPage(currentPageIndex + 1, true);
                        }
                      }}
                    />
                  </div>
                )
              )
            ) : (
              // Custom Native TTS playback bar
              <div className="w-full bg-slate-950/80 rounded-2xl p-4 border border-white/10 flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  {(!isSpeaking || isPaused) ? (
                    <button
                      onClick={() => {
                        if (isPaused) {
                          window.speechSynthesis.resume();
                          setIsPaused(false);
                        } else {
                          speakLocalText(pages[currentPageIndex].text);
                        }
                      }}
                      className="w-11 h-11 rounded-full bg-indigo-600 hover:bg-indigo-500 text-white flex items-center justify-center shadow-lg transition-all duration-300 cursor-pointer shrink-0"
                    >
                      <svg className="w-4 h-4 fill-current ml-0.5" viewBox="0 0 24 24">
                        <path d="M8 5v14l11-7z" />
                      </svg>
                    </button>
                  ) : (
                    <button
                      onClick={() => {
                        window.speechSynthesis.pause();
                        setIsPaused(true);
                      }}
                      className="w-11 h-11 rounded-full bg-amber-600 hover:bg-amber-500 text-white flex items-center justify-center shadow-lg transition-all duration-300 cursor-pointer shrink-0"
                    >
                      <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
                        <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" />
                      </svg>
                    </button>
                  )}
                  
                  <button
                    onClick={() => {
                      window.speechSynthesis.cancel();
                      setIsSpeaking(false);
                      setIsPaused(false);
                    }}
                    className="w-11 h-11 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-300 flex items-center justify-center transition-colors duration-300 cursor-pointer shrink-0"
                  >
                    <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
                      <path d="M6 6h12v12H6z" />
                    </svg>
                  </button>
                  
                  <span className="text-xs font-semibold text-slate-400">
                    {isSpeaking ? (isPaused ? "Speech Paused" : "Speaking page content...") : "Playback stopped"}
                  </span>
                </div>

                {/* Speech rate slider */}
                <div className="flex items-center gap-2 w-full sm:w-auto shrink-0 justify-end">
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider min-w-[70px]">
                    Speed: {speechRate}x
                  </span>
                  <input
                    type="range"
                    min="0.5"
                    max="2.0"
                    step="0.1"
                    value={speechRate}
                    onChange={(e) => {
                      const newRate = parseFloat(e.target.value);
                      setSpeechRate(newRate);
                      if (isSpeaking && !isPaused) {
                        speakLocalText(pages[currentPageIndex].text, selectedLocalVoice, newRate);
                      }
                    }}
                    className="w-full sm:w-28 accent-indigo-500 h-1 bg-slate-800 rounded-lg appearance-none cursor-pointer"
                  />
                </div>
              </div>
            )}
            
            {/* Pagination Controls */}
            <div className="flex justify-between items-center mt-2 gap-4">
              <button 
                onClick={() => goToPage(Math.max(0, currentPageIndex - 1), true)}
                disabled={currentPageIndex === 0 || isGeneratingAudio}
                className={`px-5 py-3 rounded-xl font-bold flex items-center gap-2 border transition-all duration-300 ${
                  currentPageIndex === 0 || isGeneratingAudio 
                    ? 'border-slate-800 text-slate-600 bg-slate-900/10 cursor-not-allowed' 
                    : 'border-white/5 text-slate-300 hover:text-white hover:bg-white/5 hover:border-white/10 cursor-pointer'
                }`}
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" />
                </svg>
                Previous
              </button>
              
              <button 
                onClick={resetReader}
                className="text-xs font-semibold text-slate-500 hover:text-rose-400 transition-colors uppercase tracking-wider py-2 cursor-pointer"
              >
                Upload another book
              </button>

              <button 
                onClick={() => goToPage(Math.min(pages.length - 1, currentPageIndex + 1), true)}
                disabled={currentPageIndex === pages.length - 1 || isGeneratingAudio}
                className={`px-5 py-3 rounded-xl font-bold flex items-center gap-2 transition-all duration-300 ${
                  currentPageIndex === pages.length - 1 || isGeneratingAudio 
                    ? 'bg-slate-800 text-slate-600 cursor-not-allowed' 
                    : 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-500/20 cursor-pointer'
                }`}
              >
                Next
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default Dashboard