import React from "react";
import RankingTable from "./components/RankingTable";
import GameResultForm from "./components/GameResultForm";
import GameHistory from "./components/GameHistory";
import ScoreGraph from "./components/ScoreGraph";
import "./App.css"; // アプリ全体のスタイル

function App() {
  return (
    <div className="App">
      <h1>チュニジアン同好会<br />麻雀世界ランキング（FIMA）</h1>
      <h2>Federation of International tunisian club Mahjong Associations</h2>
      {/* 順位表 */}
      <RankingTable />

      <hr />

      {/* 対局履歴 */}
      <GameHistory />

      <hr />

      {/* スコアグラフ */}
      <ScoreGraph />

      <hr />

      {/* 戦績入力フォーム */}
      <GameResultForm />
    </div>
  );
}

export default App;
