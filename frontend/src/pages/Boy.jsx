import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { fetchCurrentStudent, saveStudentSession } from "../utils/studentSession";
import CandidateGallery from "../components/CandidateGallery";

import "./Boy.css";

import logo from "./img/logo1.png";

function Icon({ name }) {
  const paths = {
    home: <path d="M3 11.5 12 4l9 7.5V21h-6v-6H9v6H3z" />,
    person: <><circle cx="12" cy="7" r="4" /><path d="M4 21a8 8 0 0 1 16 0" /></>,
    chart: <><path d="M4 20V10M10 20V4M16 20v-7M22 20H2" /></>,
    info: <><circle cx="12" cy="12" r="9" /><path d="M12 11v6M12 7h.01" /></>,
    back: <path d="m15 18-6-6 6-6" />,
  };

  return (
    <svg className="nav-icon" viewBox="0 0 24 24" aria-hidden="true">
      {paths[name]}
    </svg>
  );
}

function Sparkles({ burst }) {
  if (!burst) return null;

  const symbols = ["✦", "✧", "⋆", "✶"];

  return (
    <span className="sparkle-layer" aria-hidden="true">
      {Array.from({ length: 10 }, (_, index) => {
        const angle = (Math.PI * 2 * index) / 10;
        const distance = 34 + (index % 3) * 8;
        const style = {
          "--x": `${Math.cos(angle) * distance}px`,
          "--y": `${Math.sin(angle) * distance}px`,
          "--r": `${index * 23 - 55}deg`,
          animationDelay: `${(index % 4) * 18}ms`,
        };

        return (
          <span className="vote-sparkle" style={style} key={index}>
            {symbols[index % symbols.length]}
          </span>
        );
      })}
    </span>
  );
}

function VoteCelebration({ candidateName, category }) {
  return (
    <div className="vote-celebration" role="status" aria-live="polite">
      <div className="celebration-confetti" aria-hidden="true">
        {Array.from({ length: 28 }, (_, index) => (
          <span
            key={index}
            style={{
              "--confetti-x": `${((index * 37) % 100) - 50}px`,
              "--confetti-delay": `${(index % 7) * 45}ms`,
              "--confetti-color": ["#ffd166", "#ff5d8f", "#62d8ff", "#7df59a"][index % 4],
            }}
          />
        ))}
      </div>
      <span className="celebration-emoji" aria-hidden="true">🎉</span>
      <strong>Vote submitted!</strong>
      <span>{candidateName} · {category}</span>
    </div>
  );
}

function Boy() {
  const navigate = useNavigate();
  const [student, setStudent] = useState(null);
  const [candidatesList, setCandidatesList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeSparkle, setActiveSparkle] = useState({ key: "", id: 0 });
  const [celebration, setCelebration] = useState(null);
  const [alert, setAlert] = useState({ visible: false, type: "success", message: "" });
  const sparkleTimer = useRef(null);
  const celebrationTimer = useRef(null);
  const sparkleCounter = useRef(0);

  useEffect(() => {
    async function loadData() {
      const currentStudent = await fetchCurrentStudent();
      if (!currentStudent) {
        navigate("/welcome");
        return;
      }
      setStudent(currentStudent);

      try {
        const response = await fetch("/api/candidates");
        if (response.ok) {
          const data = await response.json();
          const maleCandidates = (data || []).filter(
            (c) => c.gender && c.gender.toLowerCase() === "male"
          );
          setCandidatesList(maleCandidates);
        }
      } catch (err) {
        console.error("Could not load backend candidates:", err);
      } finally {
        setLoading(false);
      }
    }
    loadData();

    return () => {
      window.clearTimeout(sparkleTimer.current);
      window.clearTimeout(celebrationTimer.current);
    };
  }, [navigate]);

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

    return `/api/${normalizedPath}`;
  };

  const showAlert = (type, message) => {
    setAlert({ visible: true, type, message });
    window.clearTimeout(showAlert.timeoutId);
    showAlert.timeoutId = window.setTimeout(() => {
      setAlert((prev) => ({ ...prev, visible: false }));
    }, 2600);
  };

  const selectCategory = async (candidate, category) => {
    setAlert({ visible: false, type: "success", message: "" });
    const titleName = category;
    const isAlreadyVoted = student?.votedTitles?.some(
      (t) => t.toLowerCase() === titleName.toLowerCase()
    );

    if (student?.hasVoted || isAlreadyVoted) {
      showAlert("error", `You have already voted in title: ${titleName}!`);
      return;
    }

    try {
      const response = await fetch(
        `/api/titles/${encodeURIComponent(titleName)}/candidates/${candidate.id}/vote`,
        {
          method: "PUT",
          credentials: "include",
        }
      );

      if (!response.ok) {
        const errText = await response.text();
        throw new Error(errText || "Voting failed");
      }

      const resData = await response.json();
      const updatedVotedTitles = resData.votedTitles || [...(student?.votedTitles || []), titleName.toLowerCase()];
      const updatedStudent = {
        ...student,
        hasVoted: resData.hasVoted,
        votedTitles: updatedVotedTitles,
      };

      saveStudentSession(updatedStudent);
      setStudent(updatedStudent);

      showAlert("success", `Vote successfully cast for ${candidate.name} in ${category}!`);
      showSparkles(candidate.id, category);
      setCelebration({ candidateId: candidate.id, candidateName: candidate.name, category });
      window.clearTimeout(celebrationTimer.current);
      celebrationTimer.current = window.setTimeout(() => setCelebration(null), 2400);
    } catch (err) {
      showAlert("error", err.message || "Could not save vote");
    }
  };

  const confirmVote = (candidate, category) => {
    const confirmed = window.confirm(
      `Vote for ${candidate.name} in ${category}? You cannot change this vote after submitting.`
    );

    if (confirmed) {
      selectCategory(candidate, category);
    }
  };

  const showSparkles = (candidateId, category) => {
    sparkleCounter.current += 1;

    setActiveSparkle({
      key: candidateId + "-" + category,
      id: sparkleCounter.current,
    });

    window.clearTimeout(sparkleTimer.current);
    sparkleTimer.current = window.setTimeout(() => {
      setActiveSparkle({ key: "", id: sparkleCounter.current });
    }, 850);
  };

  const goBack = () => {
    navigate("/home");
  };

  return (
    <div className="app-container">
      <header className="header">
        <div className="header-logo">
          <img src={logo} className="logo" alt="University logo" />
        </div>

        <div className="header-title">
          <h3>FRESHERS&apos; WELCOME VOTING</h3>
        </div>

        <button className="header-back" type="button" aria-label="Go back" onClick={goBack}>
          <Icon name="back" />
        </button>
      </header>

      <main className="page-content">
        <section className="page-heading">
          <span className="page-kicker">Student ballot · Male division</span>
          <h1>Boy Candidates</h1>
          <p>Vote for the freshers who best represent King, Smart, and Popular.</p>
          {student && (
            <div className="student-pill">
              <span className="student-pill-dot" aria-hidden="true" />
              Voting as <strong>{student.username}</strong><span>{student.major}</span>
            </div>
          )}
          {alert.visible && (
            <div className={`vote-alert ${alert.type}`} role="alert" aria-live="polite">
              <span className="vote-alert-icon">{alert.type === "success" ? "✓" : "!"}</span>
              <span>{alert.message}</span>
            </div>
          )}
        </section>

        <section className="candidates-grid">
          {loading ? (
            <p style={{ color: "#ffe6a3", textAlign: "center", gridColumn: "1 / -1" }}>Loading male candidates...</p>
          ) : candidatesList.length === 0 ? (
            <p style={{ color: "#ffe6a3", textAlign: "center", gridColumn: "1 / -1" }}>No male candidates found in the database.</p>
          ) : (
            candidatesList.map((candidate, idx) => {
              const titleList = candidate.titles && candidate.titles.length > 0
                ? candidate.titles
                : [candidate.titleName || candidate.category || "King"];

              return (
                <article className="candidate-card" key={candidate.id || idx}>
                  {celebration?.candidateId === candidate.id && (
                    <VoteCelebration candidateName={celebration.candidateName} category={celebration.category} />
                  )}
                  <div className="candidate-image-box">
                    <CandidateGallery candidate={candidate} resolveImageUrl={resolveImageUrl} className="candidate-image" />
                    <span className="candidate-number-badge">No. {candidate.no || (idx + 1)}</span>
                  </div>

                  <h2 className="candidate-name">{candidate.name}</h2>

                  <div className="candidate-info-grid">
                    <div className="candidate-info-box"><span>No.</span><strong>{candidate.no || (idx + 1)}</strong></div>
                    <div className="candidate-info-box"><span>Age</span><strong>{candidate.age || "-"}</strong></div>
                    <div className="candidate-info-box"><span>Major</span><strong>{candidate.major || "-"}</strong></div>
                    <div className="candidate-info-box"><span>Talent</span><strong>{candidate.talent || "-"}</strong></div>
                  </div>

                  {/* <div className="candidate-titles-row" style={{ display: "flex", flexWrap: "wrap", gap: "8px", margin: "12px 0" }}>
                    {titleList.map((title) => {
                      const studentCount = Number(candidate.titleStudentVoteCounts?.[title] ?? 0);
                      const teacherCount = Number(candidate.titleTeacherVoteCounts?.[title] ?? 0);

                      return (
                        <span key={`${candidate.id}-${title}`} className="candidate-title-chip" style={{
                          padding: "6px 10px",
                          borderRadius: "999px",
                          background: "rgba(255, 227, 150, 0.16)",
                          color: "#ffe7a3",
                          border: "1px solid rgba(255,227,150,0.4)",
                          fontSize: "12px",
                          fontWeight: "700",
                          letterSpacing: "0.04em",
                          textTransform: "uppercase"
                        }}>
                                                                    {title} • S:{studentCount} T:{teacherCount}
                        </span>
                      );
                    })}
                  </div> */}

                  <div className="single-vote-box" style={{ width: "100%", display: "grid", gap: "10px" }}>
                    {titleList.map((category) => {
                      const sparkleKey = candidate.id + "-" + category;
                      const isSparkling = activeSparkle.key === sparkleKey;
                      const isCategoryVoted = student?.votedTitles?.some(
                        (t) => t.toLowerCase() === category.toLowerCase()
                      );
                      const isSelected = isCategoryVoted;
                      return (
                        <button
                          key={`${candidate.id}-${category}`}
                          type="button"
                          disabled={Boolean(isCategoryVoted || student?.hasVoted)}
                          className={`category-tile ${isSelected ? "selected" : ""} ${
                            isSparkling ? "twinkle-pop" : ""
                          }`}
                          style={{ width: "100%" }}
                          aria-pressed={isSelected}
                          onClick={() => confirmVote(candidate, category)}
                        >
                          {isCategoryVoted ? `VOTED FOR ${category.toUpperCase()}` : `VOTE FOR ${category.toUpperCase()}`}
                          {isSparkling && <Sparkles key={activeSparkle.id} burst={true} />}
                        </button>
                      );
                    })}
                  </div>
                </article>
              );
            })
          )}
        </section>
      </main>
    </div>
  );
}
export default Boy;
