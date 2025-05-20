
import React, { useState, useEffect } from "react";
import axios from "axios";
import "./App.css";
import logo from "./logo.png";

function App() {
  const [view, setView] = useState("overview");
  const [teams, setTeams] = useState([]);
  const [selectedTeam, setSelectedTeam] = useState("");
  const [teamStats, setTeamStats] = useState(null);
  const [recentMatches, setRecentMatches] = useState([]);
  const [team1, setTeam1] = useState("");
  const [team2, setTeam2] = useState("");
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");
  const [matchHistory, setMatchHistory] = useState([]);
  const [lastMatch, setLastMatch] = useState(null);

  const formatConfidence = (rawConfidence) => {
    const percent = rawConfidence * 100;
    const minModel = 50, maxModel = 70, minDisplay = 55, maxDisplay = 80;
    const clamped = Math.min(Math.max(percent, minModel), maxModel);
    const scaled = ((clamped - minModel) / (maxModel - minModel)) * (maxDisplay - minDisplay) + minDisplay;
    return scaled.toFixed(1);
  };

  const confidenceLabel = (rawConfidence) => {
    const displayed = parseFloat(formatConfidence(rawConfidence));
    if (displayed >= 68) return "High";
    if (displayed >= 60) return "Moderate";
    return "Competitive";
  };

  const getConfidenceColor = (rawConfidence) => {
    const displayed = parseFloat(formatConfidence(rawConfidence));
    if (displayed >= 68) return "#4caf50";
    if (displayed >= 60) return "#ff9800";
    return "#9e9e9e";
  };

  useEffect(() => {
    axios.get("http://localhost:5000/teams")
      .then((res) => setTeams(res.data))
      .catch(() => setError("Failed to load team list."));
  }, []);

  const handleGetTeamStats = async () => {
    if (!selectedTeam) return;
    try {
      const statsRes = await axios.get(`http://localhost:5000/team_stats/${selectedTeam}`);
      setTeamStats(statsRes.data);
      const matchRes = await axios.get(`http://localhost:5000/recent_matches/${selectedTeam}`);
      setRecentMatches(matchRes.data);
    } catch {
      setTeamStats(null);
      setRecentMatches([]);
      setError("Could not fetch team stats.");
    }
  };

  const handlePredict = async () => {
    setResult(null); setError(""); setLastMatch(null);
    if (!team1 || !team2) return setError("Please select both teams.");

    try {
      const res = await axios.post("http://localhost:5000/predict", { team1, team2 });
      setResult(res.data);
      const matchRes = await axios.get(`http://localhost:5000/last_match/${team1}/${team2}`);
      setLastMatch(matchRes.data);

      setMatchHistory((prev) => [
        {
          team1,
          team2,
          winner: res.data.predicted_winner,
          confidence: res.data.confidence,
          timestamp: new Date().toLocaleTimeString(),
        },
        ...prev,
      ]);
    } catch {
      setError("Prediction failed.");
    }
  };

  const renderOverview = () => (
    <div>
      <h2>Team Overview</h2>
      <select value={selectedTeam} onChange={(e) => setSelectedTeam(e.target.value)}>
        <option value="">Select a Team</option>
        {teams.map((team) => (
          <option key={team} value={team}>{team}</option>
        ))}
      </select>
      <button onClick={handleGetTeamStats}>View Stats</button>
      {teamStats && (
        <div className="result">
          <h3>{teamStats.team}</h3>
          <div className="stat-grid">
            <p><strong>Total Games:</strong> {teamStats.games_played}</p>
            <p><strong>Win Rate:</strong> {(teamStats.win_rate * 100).toFixed(1)}%</p>
            <p><strong>Avg Score:</strong> {teamStats.avg_score.toFixed(1)}</p>
          </div>
          <div style={{ marginTop: "20px" }}>
            <h4>Recent Matches</h4>
            {recentMatches.length > 0 ? (
              <ul style={{ listStyleType: "none", paddingLeft: 0 }}>
                {recentMatches.map((match, i) => (
                  <li key={i}>
                    vs {match.opponent} → Winner: {match.won ? match.team : match.opponent}
                  </li>
                ))}
              </ul>
            ) : <p>No recent matches in the database.</p>}
          </div>
        </div>
      )}
    </div>
  );

  const renderCompare = () => (
    <div>
      <h2>Compare Teams</h2>
      <select value={team1} onChange={(e) => setTeam1(e.target.value)}>
        <option value="">Select Team 1</option>
        {teams.map((team) => (
          <option key={team} value={team}>{team}</option>
        ))}
      </select>
      <select value={team2} onChange={(e) => setTeam2(e.target.value)}>
        <option value="">Select Team 2</option>
        {teams.map((team) => (
          <option key={team} value={team}>{team}</option>
        ))}
      </select>
      <button onClick={handlePredict}>Predict</button>
      {result && (
        <div className="result">
          <h3>Predicted Winner: {result.predicted_winner}</h3>
          <p>Confidence: {formatConfidence(result.confidence)}% ({confidenceLabel(result.confidence)})</p>
          <div style={{
            height: "10px", backgroundColor: "#ddd", borderRadius: "5px",
            overflow: "hidden", width: "100%", maxWidth: "300px", margin: "0 auto"
          }}>
            <div style={{
              width: `${formatConfidence(result.confidence)}%`,
              height: "100%", backgroundColor: getConfidenceColor(result.confidence), transition: "width 0.3s ease"
            }} />
          </div>

          <div style={{ marginTop: "20px" }}>
            <h4>Stat Comparison</h4>
            <table style={{ margin: "0 auto", textAlign: "left" }}>
              <thead>
                <tr>
                  <th></th>
                  <th>{team1}</th>
                  <th>{team2}</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>Games Played</td>
                  <td>{result.team1_stats?.games_played}</td>
                  <td>{result.team2_stats?.games_played}</td>
                </tr>
                <tr>
                  <td>Win Rate</td>
                  <td>{(result.team1_stats?.win_rate * 100).toFixed(1)}%</td>
                  <td>{(result.team2_stats?.win_rate * 100).toFixed(1)}%</td>
                </tr>
                <tr>
                  <td>Avg Score</td>
                  <td>{result.team1_stats?.avg_score.toFixed(1)}</td>
                  <td>{result.team2_stats?.avg_score.toFixed(1)}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      )}
      {lastMatch && (
        <div style={{ marginTop: "10px" }}>
          <p>Last Match: {lastMatch.team1} vs {lastMatch.team2} → <strong>{lastMatch.winner}</strong></p>
        </div>
      )}
      {matchHistory.length > 0 && (
        <div>
          <h4>Match History</h4>
          <ul style={{ listStyleType: "none", paddingLeft: 0 }}>
            {matchHistory.map((match, i) => (
              <li key={i}>
                {match.timestamp}: {match.team1} vs {match.team2} → {match.winner} (
                {formatConfidence(match.confidence)}%, {confidenceLabel(match.confidence)})
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );

  return (
    <div className="App" style={{
      backgroundImage: "url('https://prosettings.net/cdn-cgi/image/dpr=1%2Cf=auto%2Cfit=cover%2Ch=1058%2Cq=85%2Cw=1920/wp-content/uploads/nuke-in-cs2-18.jpg')",
      backgroundSize: "cover",
      backgroundPosition: "center",
      backgroundRepeat: "no-repeat",
      minHeight: "100vh",
      width: "100vw",
      padding: "20px"
    }}>
      <div style={{ textAlign: "center", marginBottom: "30px", marginTop: "30px" }}>
        <img src={logo} alt="Logo" style={{ width: "300px", marginBottom: "5px" }} />
        <div>
          <button onClick={() => setView("overview")}>Team Overview</button>
          <button onClick={() => setView("compare")}>Compare Teams</button>
        </div>
      </div>
      {view === "overview" ? renderOverview() : renderCompare()}
      {error && <p className="error">Error: {error}</p>}
    </div>
  );
}

export default App;
