import React, { useState, useEffect } from "react";
import { db } from "../firebaseConfig";
import { collection, query, orderBy, onSnapshot, getDocs } from "firebase/firestore";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import "./RankingTable.css"; // コンテナのスタイルを流用

const ScoreGraph = () => {
  const [graphData, setGraphData] = useState([]);
  const [players, setPlayers] = useState([]);
  const [loading, setLoading] = useState(true);

  // グラフ用のカラーパレット
  const COLORS = ["#8884d8", "#82ca9d", "#ffc658", "#ff8042", "#0088fe"];

  useEffect(() => {
    const fetchData = async () => {
      // 1. プレイヤー一覧を取得
      const playersQuery = query(collection(db, "players"), orderBy("name", "asc"));
      const playersSnap = await getDocs(playersQuery);
      const playersData = playersSnap.docs.map((doc) => ({
        id: doc.id,
        name: doc.data().name,
      }));
      setPlayers(playersData);

      // 2. 対局履歴を取得（古い順に取得して累積計算を行う）
      const q = query(collection(db, "games"), orderBy("gameDate", "asc"), orderBy("createdAt", "asc"));

      const unsubscribe = onSnapshot(q, (snapshot) => {
        const games = snapshot.docs.map((doc) => doc.data());

        // 累積スコアの計算
        let cumulativeScores = {};
        playersData.forEach((p) => {
          cumulativeScores[p.id] = 0;
        });

        // 初期状態（0点）をデータに含める
        const data = [
          {
            name: "開始",
            ...Object.fromEntries(playersData.map((p) => [p.name, 0])),
          },
        ];

        // 各対局を回して累積値を更新
        games.forEach((game, index) => {
          const entry = { name: `第${index + 1}回` };

          playersData.forEach((p) => {
            // その対局の参加者からスコアを探す
            const result = game.results.find((r) => r.playerId === p.id);
            if (result) {
              cumulativeScores[p.id] += Number(result.score);
            }
            // 参加していない（見学）場合は前回の累積値を維持
            entry[p.name] = cumulativeScores[p.id];
          });

          data.push(entry);
        });

        setGraphData(data);
        setLoading(false);
      });

      return unsubscribe;
    };

    fetchData();
  }, []);

  if (loading) {
    return (
      <div className="ranking-container">
        <p style={{ textAlign: "center" }}>グラフを読み込み中...</p>
      </div>
    );
  }

  return (
    <div className="ranking-container">
      <h2 className="ranking-title">戦績推移グラフ</h2>
      <div style={{ width: "100%", height: 400, marginTop: "20px" }}>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={graphData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} />
            <XAxis dataKey="name" tick={{ fontSize: 12 }} interval={0} />
            <YAxis tick={{ fontSize: 12 }} />
            <Tooltip
              contentStyle={{ backgroundColor: "rgba(255, 255, 255, 0.9)", borderRadius: "8px", border: "none", boxShadow: "0 2px 10px rgba(0,0,0,0.1)" }}
            />
            <Legend verticalAlign="top" height={36} />
            {players.map((player, index) => (
              <Line
                key={player.id}
                type="monotone"
                dataKey={player.name}
                stroke={COLORS[index % COLORS.length]}
                strokeWidth={3}
                dot={{ r: 4 }}
                activeDot={{ r: 6 }}
                animationDuration={1500}
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </div>
      <style
        dangerouslySetInnerHTML={{
          __html: `
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
      `,
        }}
      />
    </div>
  );
};

export default ScoreGraph;
