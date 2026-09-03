import { useEffect, useRef, useState } from "react";
import { getVoteRatio } from "../utils/voteStore";
import { useNavigate, useSearchParams } from "react-router-dom";
import Navbar from "../components/Navbar";
import "./Result.css";

import logo from "./img/logo1.png";

export default function Result() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [candidates, setCandidates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [resultLeaders, setResultLeaders] = useState([]);
  const [pendingLeaders, setPendingLeaders] = useState([]);
  const [revealCountdown, setRevealCountdown] = useState(null);
  const [celebratingTitles, setCelebratingTitles] = useState([]);
  const initializedResults = useRef(false);
  const knownResults = useRef(new Map());
  const celebrationTimer = useRef(null);

  const resolveImageUrl = (photoValue) => {
    if (!photoValue) {
      return logo;
    }

    if (photoValue.startsWith("http://") || photoValue.startsWith("https://") || photoValue.startsWith("data:")) {
      return photoValue;
    }

    const normalizedPath = photoValue.replace(/^\/+/, "");
    if (normalizedPath.startsWith("api/")) {
      return `/${normalizedPath}`;
    }

    if (normalizedPath.startsWith("candidates_images/")) {
      return `/api/${normalizedPath}`;
    }

    return `/api/candidates_images/${normalizedPath}`;
  };

  useEffect(() => {
    let active = true;

    async function loadData() {
      try {
        const [candidatesResponse, resultsResponse] = await Promise.all([
          fetch("/api/candidates", { cache: "no-store" }),
          fetch("/api/titles/result-leaders", { cache: "no-store" }),
        ]);
        if (active && candidatesResponse.ok) {
          setCandidates(await candidatesResponse.json());
        }
        if (active && resultsResponse.ok) {
          const incomingResults = await resultsResponse.json();
          const incomingMap = new Map(incomingResults.map((leader) => [
            leader.title.toLowerCase(),
            `${leader.candidateId}:${leader.publishedAt}`,
          ]));

          if (!initializedResults.current) {
            setResultLeaders(incomingResults);
            initializedResults.current = true;
          } else {
            const changedLeaders = incomingResults.filter((leader) =>
              knownResults.current.get(leader.title.toLowerCase()) !== `${leader.candidateId}:${leader.publishedAt}`
            );
            const removedTitles = [...knownResults.current.keys()].filter((title) => !incomingMap.has(title));

            if (removedTitles.length > 0) {
              setResultLeaders((current) => current.filter(
                (leader) => !removedTitles.includes(leader.title.toLowerCase())
              ));
            }

            if (changedLeaders.length > 0) {
              setPendingLeaders((current) => {
                const changedTitles = new Set(changedLeaders.map((leader) => leader.title.toLowerCase()));
                return [
                  ...current.filter((leader) => !changedTitles.has(leader.title.toLowerCase())),
                  ...changedLeaders,
                ];
              });
              setRevealCountdown(10);
            }
          }

          knownResults.current = incomingMap;
        }
      } catch (err) {
        console.error("Failed to fetch voting results:", err);
      } finally {
        if (active) setLoading(false);
      }
    }

    loadData();

    const refreshTimer = window.setInterval(loadData, 5000);

    return () => {
      active = false;
      window.clearInterval(refreshTimer);
      window.clearTimeout(celebrationTimer.current);
    };
  }, []);

  useEffect(() => {
    if (revealCountdown === null) return undefined;

    if (revealCountdown === 0) {
      const revealedTitles = pendingLeaders.map((leader) => leader.title.toLowerCase());
      setResultLeaders((current) => {
        const revealedTitleSet = new Set(revealedTitles);
        return [
          ...current.filter((leader) => !revealedTitleSet.has(leader.title.toLowerCase())),
          ...pendingLeaders,
        ];
      });
      setCelebratingTitles(revealedTitles);
      setPendingLeaders([]);
      setRevealCountdown(null);
      window.clearTimeout(celebrationTimer.current);
      celebrationTimer.current = window.setTimeout(() => setCelebratingTitles([]), 3500);
      return undefined;
    }

    const timer = window.setTimeout(() => {
      setRevealCountdown((current) => current - 1);
    }, 1000);

    return () => window.clearTimeout(timer);
  }, [revealCountdown, pendingLeaders]);

  const selectedCandidateId = searchParams.get("candidateId");
  const selectedTitle = searchParams.get("title");

  const voteRatio = getVoteRatio();

  const getLeaderForCandidate = (candidate) => resultLeaders.find(
    (leader) => String(leader.candidateId) === String(candidate.id)
  );

  const getCandidateVoteSplit = (candidate) => {
    const leader = getLeaderForCandidate(candidate);
    const titleName = selectedTitle || leader?.title;
    if (titleName) {
      const key = titleName;
      const student = Number(candidate.titleStudentVoteCounts?.[key] ?? candidate.titleStudentVoteCounts?.[key.toLowerCase()] ?? 0);
      const teacher = Number(candidate.titleTeacherVoteCounts?.[key] ?? candidate.titleTeacherVoteCounts?.[key.toLowerCase()] ?? 0);
      return { student, teacher };
    }

    return { student: 0, teacher: 0 };
  };

  const getCandidateWeights = (candidate) => {
    const leader = selectedTitle
      ? resultLeaders.find((item) => item.title.toLowerCase() === selectedTitle.toLowerCase())
      : getLeaderForCandidate(candidate);
    return leader
      ? { student: leader.studentWeight, teacher: leader.teacherWeight }
      : voteRatio;
  };

  const getCandidateWeightedScore = (candidate, titleName) => {
    if (!titleName) return 0;
    const titleCandidates = candidates.filter((item) =>
      item.titles?.some((title) => String(title).toLowerCase() === String(titleName).toLowerCase())
    );
    const totalStudentVotes = titleCandidates.reduce(
      (sum, item) => sum + getCandidateVoteSplitForTitle(item, titleName).student, 0
    );
    const totalTeacherVotes = titleCandidates.reduce(
      (sum, item) => sum + getCandidateVoteSplitForTitle(item, titleName).teacher, 0
    );
    const votes = getCandidateVoteSplitForTitle(candidate, titleName);
    const weights = getCandidateWeights(candidate);
    const studentScore = totalStudentVotes === 0 ? 0 : (votes.student / totalStudentVotes) * weights.student;
    const teacherScore = totalTeacherVotes === 0 ? 0 : (votes.teacher / totalTeacherVotes) * weights.teacher;
    return studentScore + teacherScore;
  };

  const getCandidateVoteSplitForTitle = (candidate, titleName) => {
    const student = Number(candidate.titleStudentVoteCounts?.[titleName] ?? candidate.titleStudentVoteCounts?.[titleName.toLowerCase()] ?? 0);
    const teacher = Number(candidate.titleTeacherVoteCounts?.[titleName] ?? candidate.titleTeacherVoteCounts?.[titleName.toLowerCase()] ?? 0);
    return { student, teacher };
  };

  const displayCandidates = selectedCandidateId
    ? candidates.filter((candidate) => String(candidate.id) === String(selectedCandidateId))
    : selectedTitle
      ? candidates.filter((candidate) =>
          candidate.titles?.some((title) => String(title).toLowerCase() === String(selectedTitle).toLowerCase())
        )
      : candidates.filter((candidate) => resultLeaders.some((leader) =>
          String(leader.candidateId) === String(candidate.id)
        ));

  return (
    <div className="app-container">
      <header className="header">
        <div className="header-logo">
          <img src={logo} className="logo" alt="University logo" />
        </div>

        <div className="header-title">
          <h3>FRESHERS&apos; WELCOME VOTING</h3>
        </div>

        <button
          className="header-back"
          type="button"
          aria-label="Back to home"
          onClick={() => navigate("/home")}
        >
          <svg className="nav-icon" viewBox="0 0 24 24" aria-hidden="true">
            <path d="m15 18-6-6 6-6" />
          </svg>
        </button>
      </header>

      <main className="page-content" style={{ paddingBottom: "80px" }}>
        <section className="page-heading">
          <h1>Voting Results</h1>
          <p>Live leaderboard for the Selected Titles.</p>
          <div className="result-live-status">
            <span className="result-live-dot" aria-hidden="true" />
            <span>Live results</span>
          </div>
        </section>

        {revealCountdown !== null && pendingLeaders.length > 0 && (
          <section className="winner-countdown" role="timer" aria-live="assertive">
            <span className="winner-countdown-kicker">New title winner selected</span>
            <strong key={revealCountdown}>{revealCountdown}</strong>
            <span>Revealing {pendingLeaders.map((leader) => leader.title).join(", ")} winner{pendingLeaders.length > 1 ? "s" : ""}</span>
          </section>
        )}

        {loading ? (
          <p style={{ color: "#ffe6a3", textAlign: "center", padding: "20px" }}>
            Loading results...
          </p>
        ) : displayCandidates.length === 0 ? (
          <div style={{ textAlign: "center", color: "#ffe6a3", padding: "20px" }}>
            No result available for this title leader.
          </div>
        ) : (
          <section className="candidates-grid">
            {displayCandidates.map((candidate, idx) => {
              // const voteCount = getCandidateVoteCount(candidate);
              const candidateTitle = selectedTitle || getLeaderForCandidate(candidate)?.title || candidate.category || candidate.titleName || "Candidate";
              const isCelebrating = celebratingTitles.includes(candidateTitle.toLowerCase());
              const weightedScore = getCandidateWeightedScore(candidate, candidateTitle);
              return (
                <article className={`candidate-card result-winner-card ${isCelebrating ? "winner-revealed" : ""}`} key={`${candidate.id || idx}-${candidateTitle}`}>
                  <div className="result-winner-badge"><span aria-hidden="true">♛</span> Winner</div>
                  {isCelebrating && (
                    <div className="winner-cheer" aria-hidden="true">
                      <span>🎉</span><span>✨</span><span>🎊</span><span>⭐</span><span>✨</span>
                    </div>
                  )}
                  <div className="candidate-image-box">
                    <img
                      src={resolveImageUrl(candidate.photo || candidate.image)}
                      alt={candidate.name}
                      className="candidate-image"
                    />
                  </div>

                  <h2 className="candidate-name">{candidate.name}</h2>
                  <p style={{ color: "#ffe6a3", fontSize: "14px", textAlign: "center", marginBottom: "8px" }}>
                    Category: <strong>{candidateTitle}</strong>
                  </p>

                  <div className="candidate-info-grid" style={{ gridTemplateColumns: "repeat(3, minmax(0, 1fr))" }}>
                        <div className="candidate-info-box">
                          <span>No.</span>
                          <strong>{candidate.no || candidate.number || idx + 1}</strong>
                        </div>
                        <div className="candidate-info-box">
                          <span>Student Votes</span>
                          <strong>{getCandidateVoteSplit(candidate).student}</strong>
                        </div>
                        <div className="candidate-info-box">
                          <span>Teacher Votes</span>
                          <strong>{getCandidateVoteSplit(candidate).teacher}</strong>
                        </div>
                      </div>
                      <div style={{ marginTop: 12 }}>
                        <div style={{ fontSize: 12, color: '#ffe6a3', textAlign: 'right' }}>Weighted score: {weightedScore.toFixed(2)}%</div>
                        {/* <div style={{ fontSize: 13, color: '#ffe6a3' }}>Weighted score (using configured vote-sharing)</div> */}
                        <div style={{ height: 12, background: 'rgba(255,255,255,0.06)', borderRadius: 6, marginTop: 6 }}>
                          <div style={{ height: 12, background: 'linear-gradient(90deg,#f5cf68,#d99b2d)', width: `${Math.min(100, weightedScore)}%`, borderRadius: 6 }} />
                        </div>
                      </div>
                </article>
              );
            })}
          </section>
        )}
      </main>

      <Navbar />
    </div>
  );
}
