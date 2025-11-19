import React, { useState, useEffect } from "react";
import { db } from "../firebaseConfig";
import { collection, doc, runTransaction, serverTimestamp, getDocs, query, orderBy } from "firebase/firestore";

// 順位回数更新用のキー
const RANK_KEY_MAP = { 1: "1st", 2: "2nd", 3: "3rd", 4: "4th", 5: "5th" };

const GameResultForm = () => {
  // プレイヤー一覧（IDと名前）
  const [playerList, setPlayerList] = useState([]);
  // 4人打ち(4) か 5人打ち(5) か
  const [gameMode, setGameMode] = useState(4);

  // フォームの状態: [{ playerId, name, rank, score }, ...]
  const [results, setResults] = useState([]);

  // 追加: 年月とタイトルのための状態
  const [gameDate, setGameDate] = useState(""); // YYYY-MM 形式
  const [title, setTitle] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // 初期データ読み込み
  useEffect(() => {
    const fetchPlayers = async () => {
      // 履歴表と名前順を合わせるため、名前順で取得
      const playersQuery = query(collection(db, "players"), orderBy("name", "asc"));
      const querySnapshot = await getDocs(playersQuery);
      const players = querySnapshot.docs.map((doc) => ({
        id: doc.id,
        name: doc.data().name,
      }));
      setPlayerList(players);
      resetForm(players, 4); // デフォルトは4人打ちで初期化
    };
    fetchPlayers();
  }, []); // 最初の1回だけ実行

  // フォームのリセット処理
  const resetForm = (players, mode) => {
    setResults(
      players.map((p) => ({
        playerId: p.id,
        name: p.name,
        rank: "", // 初期値は空
        score: "", // 初期値は空
      }))
    );
    setGameMode(mode);
    setError("");
    // 追加: タイトルをリセット
    setTitle("");
    // 追加: デフォルトの開催年月を「今月」に設定
    const today = new Date();
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, "0"); // 月は0から始まるため+1
    setGameDate(`${yyyy}-${mm}`);
  };

  // モード切り替え時の処理
  const handleModeChange = (newMode) => {
    setGameMode(Number(newMode));
    resetForm(playerList, Number(newMode));
  };

  // 入力変更ハンドラ
  const handleChange = (playerId, field, value) => {
    setResults((prev) =>
      prev.map((r) => {
        if (r.playerId !== playerId) return r;
        if (field === "rank" && value === "observer") {
          return { ...r, [field]: value, score: 0 };
        }
        return { ...r, [field]: value };
      })
    );
  };

  // バリデーション
  const validateForm = () => {
    // 追加: タイトルと日付のチェック
    if (!title) {
      setError("タイトルを入力してください。");
      return false;
    }
    if (!gameDate) {
      setError("開催年月を入力してください。");
      return false;
    }

    const activePlayers = results.filter((r) => r.rank !== "observer" && r.rank !== "");
    const observers = results.filter((r) => r.rank === "observer");

    // 1. 人数チェック
    if (activePlayers.length !== gameMode) {
      setError(`${gameMode}人麻雀の場合、順位がついている人は${gameMode}人である必要があります。（現在は${activePlayers.length}人）`);
      return false;
    }

    // 2. 見学者数チェック
    const requiredObservers = playerList.length - gameMode;
    if (observers.length !== requiredObservers) {
      setError(`残りの${requiredObservers}人は「見学」を選択してください。`);
      return false;
    }

    // 3. 順位の重複チェック
    const ranks = activePlayers.map((r) => Number(r.rank));
    const uniqueRanks = new Set(ranks);
    if (uniqueRanks.size !== gameMode) {
      setError("順位が重複しています。");
      return false;
    }

    // 4. スコア未入力チェック
    if (activePlayers.some((r) => r.score === "" || r.score === null)) {
      setError("対局者のスコアをすべて入力してください。");
      return false;
    }

    // 5. スコア合計チェック
    const totalScore = activePlayers.reduce((sum, r) => sum + Number(r.score), 0);
    if (totalScore !== 0) {
      setError(`スコアの合計が0になりません。（現在: ${totalScore}）`);
      return false;
    }

    setError("");
    return true;
  };

  // 送信処理
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;

    setLoading(true);
    try {
      await runTransaction(db, async (transaction) => {
        const newGameRef = doc(collection(db, "games"));
        const playerRefs = {};
        const oldPlayerData = {};

        for (const p of playerList) {
          const ref = doc(db, "players", p.id);
          const snap = await transaction.get(ref);
          if (!snap.exists()) throw new Error(`Player ${p.name} missing`);
          playerRefs[p.id] = ref;
          oldPlayerData[p.id] = snap.data();
        }

        const activePlayers = results.filter((r) => r.rank !== "observer");

        // 変更: 保存データに title と gameDate を追加
        const gameData = {
          title: title,
          gameDate: gameDate, // YYYY-MM
          createdAt: serverTimestamp(), // 記録日時
          gameMode: gameMode,
          results: activePlayers.map((r) => ({
            playerId: r.playerId,
            name: r.name,
            rank: Number(r.rank),
            score: Number(r.score),
          })),
        };
        transaction.set(newGameRef, gameData);

        // 参加者のみ集計データを更新
        for (const result of activePlayers) {
          const oldData = oldPlayerData[result.playerId];
          const rank = Number(result.rank);
          const score = Number(result.score);
          const rankKey = RANK_KEY_MAP[rank];

          const newGameCount = (oldData.gameCount || 0) + 1;
          const newTotalScore = (oldData.totalScore || 0) + score;

          const currentAvg = oldData.averageRank || 0;
          const currentCount = oldData.gameCount || 0;
          const newAverageRank = (currentAvg * currentCount + rank) / newGameCount;

          const newRankCounts = {
            ...(oldData.rankCounts || { "1st": 0, "2nd": 0, "3rd": 0, "4th": 0, "5th": 0 }),
            [rankKey]: (oldData.rankCounts?.[rankKey] || 0) + 1,
          };

          transaction.update(playerRefs[result.playerId], {
            totalScore: newTotalScore,
            gameCount: newGameCount,
            averageRank: newAverageRank,
            rankCounts: newRankCounts,
          });
        }
      });

      console.log("更新成功");
      resetForm(playerList, gameMode);
    } catch (err) {
      console.error(err);
      setError(`更新失敗: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const currentTotalScore = results.filter((r) => r.rank !== "observer" && r.score !== "").reduce((sum, r) => sum + Number(r.score), 0);

  if (playerList.length === 0) return <p style={{ textAlign: "center" }}>Loading...</p>;

  return (
    <div style={{ maxWidth: "600px", margin: "0 auto", padding: "0 20px" }}>
      <h2 style={{ textAlign: "center" }}>戦績入力</h2>

      <div
        style={{
          marginBottom: "20px",
          textAlign: "center",
          backgroundColor: "#fff",
          padding: "15px",
          borderRadius: "8px",
          boxShadow: "0 2px 8px rgba(0,0,0,0.05)",
        }}
      >
        <label style={{ marginRight: "15px", cursor: "pointer" }}>
          <input type="radio" checked={gameMode === 4} onChange={() => handleModeChange(4)} />
          4人打ち
        </label>
        <label style={{ cursor: "pointer" }}>
          <input type="radio" checked={gameMode === 5} onChange={() => handleModeChange(5)} />
          5人打ち
        </label>
      </div>

      <form onSubmit={handleSubmit}>
        {/* 追加: 年月とタイトル入力 */}
        <div
          style={{
            display: "flex",
            gap: "10px",
            marginBottom: "15px",
            backgroundColor: "#fff",
            padding: "15px",
            borderRadius: "8px",
            boxShadow: "0 2px 8px rgba(0,0,0,0.05)",
          }}
        >
          <div style={{ flex: 1 }}>
            <label style={{ display: "block", fontSize: "0.9em", marginBottom: "5px" }}>開催年月</label>
            <input
              type="month"
              value={gameDate}
              onChange={(e) => setGameDate(e.target.value)}
              style={{ padding: "8px", width: "100%", border: "1px solid #ccc", borderRadius: "4px" }}
            />
          </div>
          <div style={{ flex: 2 }}>
            <label style={{ display: "block", fontSize: "0.9em", marginBottom: "5px" }}>タイトル</label>
            <input
              type="text"
              placeholder="例: 第1回大会"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              style={{ padding: "8px", width: "100%", border: "1px solid #ccc", borderRadius: "4px" }}
            />
          </div>
        </div>

        <table
          style={{
            width: "100%",
            marginBottom: "20px",
            borderCollapse: "separate",
            borderSpacing: "0 10px",
          }}
        >
          <tbody>
            {results.map((result) => (
              <tr
                key={result.playerId}
                style={{
                  backgroundColor: "#fff",
                  boxShadow: "0 2px 8px rgba(0,0,0,0.05)",
                }}
              >
                <td style={{ padding: "15px", fontWeight: "bold", borderTopLeftRadius: "8px", borderBottomLeftRadius: "8px" }}>{result.name}</td>
                <td style={{ padding: "10px 5px" }}>
                  <select
                    value={result.rank}
                    onChange={(e) => handleChange(result.playerId, "rank", e.target.value)}
                    style={{ padding: "8px", width: "100%", border: "1px solid #ccc", borderRadius: "4px" }}
                  >
                    <option value="">-- 選択 --</option>
                    <option value="1">1位</option>
                    <option value="2">2位</option>
                    <option value="3">3位</option>
                    <option value="4">4位</option>
                    {gameMode === 5 && <option value="5">5位</option>}
                    <option value="observer">見学</option>
                  </select>
                </td>
                <td style={{ padding: "10px 15px", borderTopRightRadius: "8px", borderBottomRightRadius: "8px" }}>
                  <input
                    type="number"
                    value={result.score}
                    onChange={(e) => handleChange(result.playerId, "score", e.target.value)}
                    placeholder="±0"
                    disabled={result.rank === "observer" || result.rank === ""}
                    style={{
                      padding: "8px",
                      width: "80px",
                      border: "1px solid #ccc",
                      borderRadius: "4px",
                      backgroundColor: result.rank === "observer" ? "#f0f0f0" : "white",
                    }}
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        <div
          style={{
            textAlign: "right",
            marginBottom: "15px",
            fontWeight: "bold",
            fontSize: "1.1em",
            color: currentTotalScore !== 0 ? "red" : "green",
          }}
        >
          スコア合計: {currentTotalScore}
        </div>

        {error && <p style={{ color: "red", textAlign: "center", fontWeight: "bold" }}>{error}</p>}

        <button
          type="submit"
          disabled={loading}
          style={{
            padding: "12px 25px",
            fontSize: "16px",
            backgroundColor: loading ? "#ccc" : "#007bff",
            color: "white",
            border: "none",
            borderRadius: "5px",
            cursor: "pointer",
            width: "100%",
            fontWeight: "bold",
          }}
        >
          {loading ? "送信中..." : "結果を記録する"}
        </button>
      </form>
    </div>
  );
};

export default GameResultForm;
