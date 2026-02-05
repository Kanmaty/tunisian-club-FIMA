import React, { useState, useEffect, useCallback } from "react";
import fimaMovie from "../movie/FIMA.mp4";

const OpeningMovie = ({ onFinish }) => {
  const [fadeOut, setFadeOut] = useState(false);

  // handleCompleteをuseCallbackで囲むことで、警告を回避します
  const handleComplete = useCallback(() => {
    setFadeOut(true);
    setTimeout(onFinish, 1000);
  }, [onFinish]);

  useEffect(() => {
    // 5.5秒後に自動終了
    const timer = setTimeout(() => {
      handleComplete();
    }, 5500);

    return () => clearTimeout(timer);
  }, [handleComplete]); // dependency arrayにhandleCompleteを追加

  return (
    <div
      className={`fixed inset-0 z-[9999] bg-black flex items-center justify-center transition-opacity duration-1000 ${fadeOut ? "opacity-0" : "opacity-100"}`}
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: 9999,
        backgroundColor: "black",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <video autoPlay muted playsInline onEnded={handleComplete} style={{ width: "100%", height: "100%", objectFit: "cover" }}>
        <source src={fimaMovie} type="video/mp4" />
        Your browser does not support the video tag.
      </video>

      <div
        style={{
          position: "absolute",
          inset: 0,
          backgroundColor: "rgba(0,0,0,0.3)",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          pointerEvents: "none",
          color: "white",
        }}
      >
        <h1 className="animate-pulse" style={{ fontSize: "clamp(3rem, 10vw, 6rem)", fontWeight: 900, letterSpacing: "0.3em", margin: 0 }}>
          FIMA
        </h1>
        <div className="animate-bar-grow" style={{ marginTop: "1rem", height: "4px", backgroundColor: "#6366f1", borderRadius: "9999px" }} />
      </div>

      <button
        onClick={handleComplete}
        style={{
          position: "absolute",
          bottom: "40px",
          right: "40px",
          color: "rgba(255,255,255,0.5)",
          display: "flex",
          alignItems: "center",
          gap: "8px",
          backgroundColor: "rgba(255,255,255,0.1)",
          padding: "8px 24px",
          borderRadius: "9999px",
          backdropFilter: "blur(12px)",
          border: "1px solid rgba(255,255,255,0.2)",
          cursor: "pointer",
          transition: "all 0.3s",
        }}
      >
        SKIP
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <line x1="18" y1="6" x2="6" y2="18"></line>
          <line x1="6" y1="6" x2="18" y2="18"></line>
        </svg>
      </button>

      <style
        dangerouslySetInnerHTML={{
          __html: `
        @keyframes bar-grow { 0% { width: 0; opacity: 0; } 100% { width: 96px; opacity: 1; } }
        .animate-bar-grow { animation: bar-grow 1.5s ease-out forwards; }
        @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.7; } }
        .animate-pulse { animation: pulse 2s infinite; }
      `,
        }}
      />
    </div>
  );
};

export default OpeningMovie;
