// src/components/GameHistory.js
import React, { useState, useEffect } from "react";
import { db } from "../firebaseConfig";
import { collection, query, orderBy, onSnapshot, getDocs } from "firebase/firestore";
import "./RankingTable.css"; // CSSは順位表のものを流用

const GameHistory = () => {
  const [games, setGames] = useState([]);
  const [players, setPlayers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      // 1. プレイヤー一覧を取得（テーブルのヘッダー用）
      // 順位表と並びを合わせるため、名前順(asc)で取得します
      const playersQuery = query(collection(db, "players"), orderBy("name", "asc"));
      const playersSnap = await getDocs(playersQuery);
      const playersData = playersSnap.docs.map((doc) => ({
        id: doc.id,
        name: doc.data().name,
      }));
      setPlayers(playersData);

      // 2. 対局履歴を開催年月 (gameDate) の新しい順に取得
      const q = query(collection(db, "games"), orderBy("gameDate", "desc"));
      const unsubscribe = onSnapshot(q, (snapshot) => {
        const gamesData = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));
        setGames(gamesData);
        setLoading(false);
      });

      return unsubscribe;
    };

    fetchData();
    // 注意: fetchData内のonSnapshot解除は、この簡易実装では省略されています。
    // 厳密な実装が必要な場合はuseEffect内で直接onSnapshotを呼ぶ形にリファクタリングします。
  }, []);

  // YYYY-MM を YYYY年MM月 に変換する関数
  const formatGameDate = (dateString) => {
    if (!dateString || !dateString.includes("-")) return dateString;
    try {
      const [year, month] = dateString.split("-");
      return `${year}年${Number(month)}月`; // Number() で "05" を "5" に変換
    } catch (e) {
      return dateString;
    }
  };

  // 特定のプレイヤーのそのゲームでの結果を取得するヘルパー関数
  const getPlayerResult = (game, playerId) => {
    if (!game.results) return { rank: "見", score: 0 };

    const result = game.results.find((r) => r.playerId === playerId);
    if (!result) {
      // 結果配列に含まれていない = 見学
      return { rank: "見", score: 0 };
    }
    return result;
  };

  if (loading) {
    return (
      <div className="ranking-container">
        <p style={{ textAlign: "center" }}>履歴を読み込み中...</p>
      </div>
    );
  }

  return (
    <div className="ranking-container">
      <h2 className="ranking-title">対局履歴</h2>
      <div style={{ overflowX: "auto" }}>
        {" "}
        {/* 横スクロール対応 */}
        <table className="styled-table">
          <thead>
            <tr>
              {/* 左端：開催日とタイトル */}
              <th style={{ minWidth: "180px", textAlign: "left" }}>開催日 / タイトル</th>
              <th style={{ width: "60px" }}>人数</th>
              {/* 各プレイヤーの列 */}
              {players.map((player) => (
                <th key={player.id}>{player.name}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {games.map((game) => (
              <tr key={game.id}>
                {/* 日時・タイトルセル */}
                <td style={{ textAlign: "left", paddingLeft: "15px" }}>
                  <div style={{ fontWeight: "bold", fontSize: "1.0em" }}>{game.title || "(タイトルなし)"}</div>
                  <div style={{ fontSize: "0.85em", color: "#666", marginTop: "2px" }}>{formatGameDate(game.gameDate)}</div>
                </td>
                {/* 人数セル */}
                <td>
                  <span
                    style={{
                      padding: "2px 8px",
                      borderRadius: "10px",
                      backgroundColor: game.gameMode === 5 ? "#e0f7fa" : "#fff3e0",
                      fontSize: "0.8em",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {game.gameMode}人
                  </span>
                </td>
                {/* 各プレイヤーのスコアセル */}
                {players.map((player) => {
                  const { rank, score } = getPlayerResult(game, player.id);
                  const isTop = rank === 1;
                  const isNegative = score < 0;
                  const isObserver = rank === "見" || rank === "observer";

                  return (
                    <td key={player.id}>
                      {!isObserver ? (
                        <div>
                          <div
                            style={{
                              fontWeight: isTop ? "bold" : "normal",
                              color: isTop ? "#d4af37" : "#555",
                              fontSize: "0.85em",
                            }}
                          >
                            {rank}着
                          </div>
                          <div
                            style={{
                              color: isNegative ? "red" : "blue",
                              fontSize: "1.1em",
                              fontWeight: "bold",
                              marginTop: "2px",
                            }}
                          >
                            {score > 0 ? `+${score}` : score}
                          </div>
                        </div>
                      ) : (
                        <span style={{ color: "#ccc", fontSize: "0.9em" }}>-</span>
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default GameHistory;
