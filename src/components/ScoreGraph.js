import React, { useState, useEffect, useMemo } from 'react';
import { initializeApp } from 'firebase/app';
import { getAuth, signInWithCustomToken, signInAnonymously, onAuthStateChanged } from 'firebase/auth';
import { getFirestore, collection, query, onSnapshot, getDocs, doc } from 'firebase/firestore';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from 'recharts';
import { TrendingUp, Loader2 } from 'lucide-react';

// --- Firebase 構成の初期化 (環境変数を使用) ---
const firebaseConfig = JSON.parse(typeof __firebase_config !== 'undefined' ? __firebase_config : '{}');
const appId = typeof __app_id !== 'undefined' ? __app_id : 'default-app-id';

// アプリの初期化（二重初期化防止）
let app;
try {
  app = initializeApp(firebaseConfig);
} catch (e) {
  // すでに初期化されている場合は既存のインスタンスを取得
}

const auth = getAuth(app);
const db = getFirestore(app);

// グラフ用のカラーパレット
const COLORS = ['#8884d8', '#82ca9d', '#ffc658', '#ff8042', '#0088fe'];

export default function App() {
  const [user, setUser] = useState(null);
  const [graphData, setGraphData] = useState([]);
  const [players, setPlayers] = useState([]);
  const [loading, setLoading] = useState(true);

  // --- 認証フロー (RULE 3) ---
  useEffect(() => {
    const initAuth = async () => {
      try {
        if (typeof __initial_auth_token !== 'undefined' && __initial_auth_token) {
          await signInWithCustomToken(auth, __initial_auth_token);
        } else {
          await signInAnonymously(auth);
        }
      } catch (err) {
        console.error("Auth error:", err);
      }
    };
    initAuth();
    const unsubscribe = onAuthStateChanged(auth, setUser);
    return () => unsubscribe();
  }, []);

  // --- データ取得 (RULE 1 & 2) ---
  useEffect(() => {
    if (!user) return;

    const fetchData = async () => {
      try {
        // 1. プレイヤー一覧を取得 (RULE 1 のパスを適用)
        const playersRef = collection(db, 'artifacts', appId, 'public', 'data', 'players');
        const playersSnap = await getDocs(playersRef);
        const playersData = playersSnap.docs.map(doc => ({
          id: doc.id,
          name: doc.data().name
        })).sort((a, b) => a.name.localeCompare(b.name));
        
        setPlayers(playersData);

        // 2. 対局履歴を取得 (RULE 2: シンプルなクエリで取得しメモリでソート)
        const gamesRef = collection(db, 'artifacts', appId, 'public', 'data', 'games');
        const unsubscribe = onSnapshot(gamesRef, (snapshot) => {
          let games = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
          }));

          // JavaScriptメモリ内でソート (gameDate順)
          games.sort((a, b) => {
            const dateA = a.gameDate || '';
            const dateB = b.gameDate || '';
            if (dateA !== dateB) return dateA.localeCompare(dateB);
            // 同日の場合は作成順
            return (a.createdAt?.seconds || 0) - (b.createdAt?.seconds || 0);
          });

          // 累積スコアの計算
          let cumulativeScores = {};
          playersData.forEach(p => {
            cumulativeScores[p.id] = 0;
          });

          const data = [
            {
              name: '開始',
              ...Object.fromEntries(playersData.map(p => [p.name, 0]))
            }
          ];

          games.forEach((game, index) => {
            const entry = { name: `第${index + 1}回` };
            playersData.forEach(p => {
              const result = game.results?.find(r => r.playerId === p.id);
              if (result) {
                cumulativeScores[p.id] += Number(result.score);
              }
              entry[p.name] = cumulativeScores[p.id];
            });
            data.push(entry);
          });

          setGraphData(data);
          setLoading(false);
        }, (error) => {
          console.error("Firestore snapshot error:", error);
          setLoading(false);
        });

        return unsubscribe;
      } catch (err) {
        console.error("Data fetch error:", err);
        setLoading(false);
      }
    };

    fetchData();
  }, [user]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] p-8 bg-gray-50 rounded-xl">
        <Loader2 className="w-8 h-8 animate-spin text-blue-500 mb-4" />
        <p className="text-gray-600 font-medium">戦績データを読み込み中...</p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto my-8 p-6 bg-white rounded-2xl shadow-lg border border-gray-100 font-sans">
      <div className="flex items-center justify-center gap-3 mb-8">
        <TrendingUp className="w-8 h-8 text-indigo-600" />
        <h2 className="text-2xl font-bold text-gray-800">戦績推移グラフ</h2>
      </div>

      <div className="relative">
        <div className="overflow-x-auto pb-4 custom-scrollbar">
          <div className="min-w-[700px] h-[450px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart
                data={graphData}
                margin={{ top: 20, right: 40, left: 10, bottom: 20 }}
              >
                {/* 補助線を垂直方向にも追加 (vertical={true}) */}
                <CartesianGrid strokeDasharray="3 3" vertical={true} stroke="#f0f0f0" />
                <XAxis 
                  dataKey="name" 
                  tick={{ fontSize: 12, fill: '#94a3b8' }}
                  axisLine={{ stroke: '#e2e8f0' }}
                  tickLine={false}
                  interval={0} // すべてのラベルを表示するように変更
                  dy={10}
                />
                <YAxis 
                  tick={{ fontSize: 12, fill: '#94a3b8' }}
                  axisLine={false}
                  tickLine={false}
                  dx={-10}
                />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'rgba(255, 255, 255, 0.98)', 
                    borderRadius: '12px', 
                    border: 'none', 
                    boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
                    padding: '12px'
                  }}
                  itemStyle={{ fontSize: '13px', fontWeight: '600' }}
                />
                <Legend 
                  verticalAlign="top" 
                  align="center"
                  height={50}
                  iconType="circle"
                  wrapperStyle={{ paddingBottom: '20px', fontSize: '14px', fontWeight: '500' }}
                />
                {players.map((player, index) => (
                  <Line
                    key={player.id}
                    type="monotone"
                    dataKey={player.name}
                    stroke={COLORS[index % COLORS.length]}
                    strokeWidth={3}
                    dot={{ r: 5, strokeWidth: 2, fill: '#fff' }}
                    activeDot={{ r: 7, strokeWidth: 0, shadow: '0 0 10px rgba(0,0,0,0.2)' }}
                    animationDuration={1500}
                    connectNulls
                  />
                ))}
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <style dangerouslySetInnerHTML={{ __html: `
        .custom-scrollbar::-webkit-scrollbar {
          height: 6px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: #f1f5f9;
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #cbd5e1;
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: #94a3b8;
        }
      `}} />
    </div>
  );
}