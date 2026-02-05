import React, { useState, useEffect } from 'react';

// 動画ファイルをインポートすることで、ビルド時に適切なパスに変換されます
// フォルダ構成に合わせてパスを調整してください（例: src/movie/FIMA.mp4）
import fimaMovie from '../movie/FIMA.mp4';

/**
 * OpeningMovie コンポーネント
 * 外部ライブラリ(lucide-react)に依存せず、インラインSVGを使用するように修正しました。
 * @param {Function} onFinish - 動画終了時またはスキップ時に呼ばれるコールバック関数
 */
const OpeningMovie = ({ onFinish }) => {
  const [fadeOut, setFadeOut] = useState(false);

  useEffect(() => {
    // 動画の長さに合わせて自動終了タイマーを設定 (例: 5.5秒)
    // 動画が読み込めない場合や止まった場合の保険として機能します
    const timer = setTimeout(() => {
      handleComplete();
    }, 5500);

    return () => clearTimeout(timer);
  }, []);

  // 終了処理（フェードアウト演出付き）
  const handleComplete = () => {
    setFadeOut(true);
    // フェードアウトアニメーションの完了を待ってから親に通知
    setTimeout(onFinish, 1000);
  };

  return (
    <div 
      className={`fixed inset-0 z-[9999] bg-black flex items-center justify-center transition-opacity duration-1000 ${
        fadeOut ? 'opacity-0' : 'opacity-100'
      }`}
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: 9999,
        backgroundColor: 'black',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }}
    >
      {/* ビデオ本体: 自動再生(autoPlay), 消音(muted), インライン再生(playsInline)が必須 */}
      <video
        autoPlay
        muted
        playsInline
        onEnded={handleComplete}
        style={{
          width: '100%',
          height: '100%',
          objectFit: 'cover'
        }}
      >
        <source 
          src={fimaMovie} 
          type="video/mp4" 
        />
        Your browser does not support the video tag.
      </video>
      
      {/* オーバーレイ演出（タイトルロゴなど） */}
      <div 
        style={{
          position: 'absolute',
          inset: 0,
          backgroundColor: 'rgba(0,0,0,0.3)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          pointerEvents: 'none',
          color: 'white'
        }}
      >
        <h1 
          className="animate-pulse"
          style={{
            fontSize: 'clamp(3rem, 10vw, 6rem)',
            fontWeight: 900,
            letterSpacing: '0.3em',
            margin: 0
          }}
        >
          FIMA
        </h1>
        <div className="animate-bar-grow" style={{ marginTop: '1rem', height: '4px', backgroundColor: '#6366f1', borderRadius: '9999px' }} />
        <p style={{ marginTop: '1.5rem', letterSpacing: '0.5em', fontSize: '0.75rem', textTransform: 'uppercase', opacity: 0.7 }}>
          Mahjong World Ranking
        </p>
      </div>

      {/* スキップボタン */}
      <button 
        onClick={handleComplete}
        style={{
          position: 'absolute',
          bottom: '40px',
          right: '40px',
          color: 'rgba(255,255,255,0.5)',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          backgroundColor: 'rgba(255,255,255,0.1)',
          padding: '8px 24px',
          borderRadius: '9999px',
          backdropFilter: 'blur(12px)',
          border: '1px solid rgba(255,255,255,0.2)',
          cursor: 'pointer',
          transition: 'all 0.3s',
          fontSize: '14px'
        }}
        onMouseEnter={(e) => e.target.style.color = 'white'}
        onMouseLeave={(e) => e.target.style.color = 'rgba(255,255,255,0.5)'}
      >
        SKIP 
        {/* Lucideの代わりにインラインSVGを使用 */}
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <line x1="18" y1="6" x2="6" y2="18"></line>
          <line x1="6" y1="6" x2="18" y2="18"></line>
        </svg>
      </button>

      {/* アニメーション用のインラインスタイル */}
      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes bar-grow {
          0% { width: 0; opacity: 0; }
          100% { width: 96px; opacity: 1; }
        }
        .animate-bar-grow {
          animation: bar-grow 1.5s ease-out forwards;
        }
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.7; }
        }
        .animate-pulse {
          animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
        }
      `}} />
    </div>
  );
};

export default OpeningMovie;