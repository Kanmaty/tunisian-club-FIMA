import React, { useState, useEffect } from "react";
import { db } from "../firebaseConfig";
import { collection, query, orderBy, onSnapshot } from "firebase/firestore";
import "./RankingTable.css"; // 作成したCSSをインポート

const RankingTable = () => {
  const [players, setPlayers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // 累計スコア(totalScore)の降順(desc)でプレイヤーデータを取得
    const q = query(collection(db, "players"), orderBy("totalScore", "desc"));

    // onSnapshotでリアルタイムの変更を購読
    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const playersData = [];
      querySnapshot.forEach((doc) => {
        playersData.push({ id: doc.id, ...doc.data() });
      });
      setPlayers(playersData);
      setLoading(false);
    });

    // コンポーネントがアンマウントされた時に購読を解除
    return () => unsubscribe();
  }, []); // 最初の1回だけ実行

  if (loading) {
    return (
      <div className="ranking-container">
        <p style={{ textAlign: "center" }}>読み込み中...</p>
      </div>
    );
  }

  return (
    <div className="ranking-container">
      <h2 className="ranking-title">総合順位表</h2>
      {/* --- ↓↓ 修正箇所 ↓↓ --- */}
      {/* テーブルが横にはみ出た場合にスクロールできるようにするdivラッパー */}
      <div style={{ overflowX: "auto", width: "100%" }}>
        {/* --- ↑↑ 修正箇所 ↑↑ --- */}

        <table className="styled-table">
          <thead>
            <tr>
              <th>順位</th>
              <th>名前</th>
              <th>Total</th>
              <th>対局数</th>
              <th>平均順位</th>
              <th>1着</th>
              <th>2着</th>
              <th>3着</th>
              <th>4着</th>
              <th>5着</th>
            </tr>
          </thead>
          <tbody>
            {players.map((player, index) => (
              <tr key={player.id}>
                <td>
                  {/* 1~3位に特別な色をつけるロジック */}
                  <span className={index === 0 ? "rank-1" : index === 1 ? "rank-2" : index === 2 ? "rank-3" : ""}>{index + 1}</span>
                </td>
                <td style={{ fontWeight: "bold", whiteSpace: "nowrap" }}>{player.name}</td>
                {/* スコアがプラスなら青、マイナスなら赤にする処理 */}
                <td style={{ color: player.totalScore >= 0 ? "blue" : "red", fontWeight: "bold" }}>
                  {player.totalScore > 0 ? `+${player.totalScore}` : player.totalScore}
                </td>
                <td>{player.gameCount}</td>
                <td>{player.averageRank ? player.averageRank.toFixed(2) : "-"}</td>
                <td>{player.rankCounts["1st"] || 0}</td>
                <td>{player.rankCounts["2nd"] || 0}</td>
                <td>{player.rankCounts["3rd"] || 0}</td>
                <td>{player.rankCounts["4th"] || 0}</td>
                <td>{player.rankCounts["5th"] || 0}</td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* --- ↓↓ 修正箇所 ↓↓ --- */}
      </div>{" "}
      {/* スクロール用divの閉じタグ */}
      {/* --- ↑↑ 修正箇所 ↑↑ --- */}
    </div>
  );
};

export default RankingTable;
