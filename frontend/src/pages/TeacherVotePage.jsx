import { useEffect, useMemo, useRef, useState } from "react";
import { useLocation } from "react-router-dom";
import logo from "./img/logo1.png";
import "./TeacherVotePage.css";

const TITLES_API_URL = "/api/titles";
const CANDIDATES_API_URL = "/api/candidates";

function TeacherVotePage() {
    const location = useLocation();
    const token = useMemo(() => new URLSearchParams(location.search).get("token"), [location.search]);
    const [titles, setTitles] = useState([]);
    const [candidates, setCandidates] = useState([]);
    const [loading, setLoading] = useState(true);
    const [verified, setVerified] = useState(false);
    const [status, setStatus] = useState("Checking teacher token...");
    const [activeGender, setActiveGender] = useState("Male");
    const [votedTitles, setVotedTitles] = useState([]);
    const [submittingKey, setSubmittingKey] = useState("");
    const [celebration, setCelebration] = useState(null);
    const [alert, setAlert] = useState({ visible: false, type: "success", message: "" });
    const alertTimer = useRef(null);
    const celebrationTimer = useRef(null);

    const resolveImageUrl = (photoValue) => {
        if (!photoValue) return logo;
        if (/^(https?:|data:)/.test(photoValue)) return photoValue;
        const normalizedPath = photoValue.replace(/^\/+/, "");
        return normalizedPath.startsWith("api/") ? `/${normalizedPath}` : `/api/${normalizedPath}`;
    };

    const showAlert = (type, message) => {
        setAlert({ visible: true, type, message });
        window.clearTimeout(alertTimer.current);
        alertTimer.current = window.setTimeout(() => {
            setAlert((current) => ({ ...current, visible: false }));
        }, 3200);
    };

    useEffect(() => {
        let active = true;

        async function initializeVoting() {
            if (!token) {
                setStatus("Teacher token is missing. Please scan the QR code again.");
                setLoading(false);
                return;
            }

            try {
                const verifyResponse = await fetch("/api/teacher/verify", {
                    method: "POST",
                    credentials: "include",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ token }),
                });
                if (!verifyResponse.ok) {
                    const errorBody = await verifyResponse.text();
                    throw new Error(errorBody || "Teacher token is invalid or expired.");
                }
                const verification = await verifyResponse.json();

                const [titlesResponse, candidatesResponse] = await Promise.all([
                    fetch(TITLES_API_URL, { credentials: "include" }),
                    fetch(CANDIDATES_API_URL, { credentials: "include" }),
                ]);
                if (!titlesResponse.ok || !candidatesResponse.ok) {
                    throw new Error("Unable to load teacher voting data.");
                }

                if (active) {
                    setTitles(await titlesResponse.json());
                    setCandidates(await candidatesResponse.json());
                    setVotedTitles(verification.votedTitles || []);
                    setVerified(true);
                    setStatus("Verified teacher ballot");
                }
            } catch (error) {
                if (active) setStatus(error.message || "Teacher token could not be verified.");
            } finally {
                if (active) setLoading(false);
            }
        }

        initializeVoting();
        return () => {
            active = false;
            window.clearTimeout(alertTimer.current);
            window.clearTimeout(celebrationTimer.current);
        };
    }, [token]);

    const visibleTitles = titles.filter((title) =>
        String(title.gender || "").toLowerCase() === activeGender.toLowerCase()
    );

    const visibleCandidates = candidates.filter((candidate) =>
        String(candidate.gender || "").toLowerCase() === activeGender.toLowerCase()
    );

    const titlesForCandidate = (candidate) => visibleTitles.filter((title) =>
        candidate.category === title.name || candidate.titles?.includes(title.name)
    );

    const handleVote = async (title, candidate) => {
        const titleKey = title.name.toLowerCase();
        if (votedTitles.some((item) => item.toLowerCase() === titleKey)) {
            showAlert("error", `You already voted in ${title.name}.`);
            return;
        }

        if (!window.confirm(`Vote for ${candidate.name} in ${title.name}? You cannot change this vote after submitting.`)) {
            return;
        }

        const requestKey = `${title.id}-${candidate.id}`;
        setSubmittingKey(requestKey);
        try {
            const response = await fetch(
                `/api/titles/teacher/${encodeURIComponent(title.name)}/candidates/${candidate.id}/vote`,
                { method: "PUT", credentials: "include" }
            );
            if (!response.ok) {
                const message = await response.text();
                if (response.status === 409) {
                    setVotedTitles((current) => current.some((item) => item.toLowerCase() === titleKey)
                        ? current
                        : [...current, titleKey]);
                }
                throw new Error(message || "Teacher vote could not be saved.");
            }

            const payload = await response.json();
            setVotedTitles(payload.votedTitles || [...votedTitles, titleKey]);
            setCelebration({ candidateId: candidate.id, title: title.name });
            showAlert("success", `Your teacher vote for ${candidate.name} in ${title.name} was saved.`);
            window.clearTimeout(celebrationTimer.current);
            celebrationTimer.current = window.setTimeout(() => setCelebration(null), 2400);
        } catch (error) {
            showAlert("error", error.message || "Teacher vote could not be saved.");
        } finally {
            setSubmittingKey("");
        }
    };

    if (loading) {
        return <main className="teacher-vote-state"><span className="teacher-loader" />Loading teacher ballot...</main>;
    }

    if (!verified) {
        return (
            <main className="teacher-vote-state teacher-vote-error">
                <img src={logo} alt="MTU logo" />
                <h1>Teacher ballot unavailable</h1>
                <p>{status}</p>
            </main>
        );
    }

    return (
        <main className="teacher-vote-page">
            <header className="teacher-vote-header">
                <img src={logo} alt="MTU logo" />
                <div>
                    <span>MTU Science And Tech Club</span>
                    <h1>Teacher Voting</h1>
                    <p><i />{status} · Votes count separately from student votes</p>
                </div>
            </header>

            {alert.visible && <div className={`teacher-alert ${alert.type}`} role="alert">{alert.message}</div>}

            <nav className="teacher-gender-tabs" aria-label="Candidate division">
                {["Male", "Female"].map((gender) => (
                    <button key={gender} type="button" className={activeGender === gender ? "active" : ""} onClick={() => setActiveGender(gender)}>
                        {gender === "Male" ? "Boy Candidates" : "Girl Candidates"}
                    </button>
                ))}
            </nav>

            <section className="teacher-ballot">
                <div className="teacher-ballot-heading">
                    <div><span>Teacher ballot</span><h2>{activeGender === "Male" ? "Boy Candidates" : "Girl Candidates"}</h2></div>
                    <span>{visibleCandidates.length} candidates</span>
                </div>

                {visibleCandidates.length === 0 ? <p className="teacher-empty">No candidates are available in this division.</p> : (
                    <div className="teacher-candidate-grid">
                        {visibleCandidates.map((candidate, index) => {
                            const candidateTitles = titlesForCandidate(candidate);
                            const isCelebrating = celebration?.candidateId === candidate.id;
                            return (
                                <article className={`teacher-candidate-card ${isCelebrating ? "celebrating" : ""}`} key={candidate.id}>
                                    {isCelebrating && <div className="teacher-cheer" aria-hidden="true">🎉 ✨ 🎊</div>}
                                    <div className="teacher-candidate-image">
                                        <img src={resolveImageUrl(candidate.photo)} alt={candidate.name} />
                                        <span>No. {candidate.no || index + 1}</span>
                                    </div>
                                    <h3>{candidate.name}</h3>
                                    <div className="teacher-candidate-stats">
                                        <div><span>Age</span><strong>{candidate.age || "-"}</strong></div>
                                        <div><span>Major</span><strong>{candidate.major || "-"}</strong></div>
                                        <div><span>Talent</span><strong>{candidate.talent || "-"}</strong></div>
                                    </div>
                                    <div className="teacher-title-buttons">
                                        {candidateTitles.map((title) => {
                                            const titleVoted = votedTitles.some((item) => item.toLowerCase() === title.name.toLowerCase());
                                            const requestKey = `${title.id}-${candidate.id}`;
                                            return (
                                                <button
                                                    key={title.id}
                                                    type="button"
                                                    disabled={titleVoted || Boolean(submittingKey)}
                                                    className={titleVoted ? "voted" : ""}
                                                    onClick={() => handleVote(title, candidate)}
                                                >
                                                    {submittingKey === requestKey ? "Saving vote..." : titleVoted ? `Voted for ${title.name}` : `Vote for ${title.name}`}
                                                </button>
                                            );
                                        })}
                                    </div>
                                </article>
                            );
                        })}
                    </div>
                )}
            </section>
        </main>
    );
}

export default TeacherVotePage;
