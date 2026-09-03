import { useEffect, useMemo, useState } from "react";
import { recordVote, getVoteCountsByPage } from "../utils/voteStore";

const API_URL = "/api/candidates";

export default function VotePage({ voterType, title, accentClass = "" }) {
    const [candidates, setCandidates] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [voteCounts, setVoteCounts] = useState({});

    const loadCandidates = async () => {
        try {
            const response = await fetch(API_URL);
            if (!response.ok) {
                throw new Error("Unable to load candidates");
            }
            const data = await response.json();
            setCandidates(data || []);
            setError("");
        } catch (loadError) {
            setError(loadError.message || "Failed to load candidates");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadCandidates();
        setVoteCounts(getVoteCountsByPage(voterType));
    }, [voterType]);

    const totalVotes = useMemo(
        () => candidates.reduce((sum, candidate) => sum + Number(candidate.votes || 0), 0),
        [candidates]
    );

    const handleVote = async (candidate) => {
        recordVote(voterType, candidate.id);
        setVoteCounts(getVoteCountsByPage(voterType));

        try {
            const response = await fetch(`/api/titles/${encodeURIComponent(candidate.titleName)}/candidates/${candidate.id}/vote`, {
                method: "PUT",
                credentials: "include",
            });

            if (!response.ok) {
                const message = await response.text();
                throw new Error(message || "Vote could not be saved");
            }

            await loadCandidates();
        } catch (voteError) {
            console.error(voteError);
            setError(voteError.message || "Vote could not be saved");
        }
    };

    if (loading) {
        return <div className="vote-page"><p>Loading candidates...</p></div>;
    }

    return (
        <div className={`vote-page ${accentClass}`}>
            <div className="vote-page-header">
                <div>
                    <p className="vote-page-kicker">Voting Page</p>
                    <h1>{title}</h1>
                </div>
                <div className="vote-page-total">
                    <span>Total Votes</span>
                    <strong>{Object.values(voteCounts).reduce((sum, count) => sum + Number(count || 0), 0)}</strong>
                </div>
            </div>

            {error && <p className="dashboard-error">{error}</p>}

            <div className="vote-grid">
                {candidates.map((candidate) => {
                    const count = Number(voteCounts[String(candidate.id)] || 0);
                    const percentage = totalVotes === 0 ? 0 : (count / totalVotes) * 100;

                    return (
                        <div key={candidate.id} className="vote-card">
                            <div className="vote-card-top">
                                <div className="vote-card-image-wrap">
                                    <img
                                        src={candidate.photo || "https://images.unsplash.com/photo-1544005313-94ddf0286df2"}
                                        alt={candidate.name}
                                        className="vote-card-image"
                                    />
                                </div>

                                <div className="vote-card-body">
                                    <span className="vote-number">#{candidate.no ?? "-"}</span>
                                    <h3>{candidate.name}</h3>
                                    <p>{candidate.gender} • {candidate.age} yrs • {candidate.major}</p>
                                    <p>Talent: {candidate.talent}</p>
                                </div>
                            </div>

                            <div className="vote-stat-row">
                                <span>{count} votes</span>
                                <span>{Math.round(percentage)}%</span>
                            </div>

                            <div className="progress-bar" aria-label={`${candidate.name} vote progress`}>
                                <span style={{ width: `${percentage}%` }} />
                            </div>

                            <button type="button" className="primary-button vote-button" onClick={() => handleVote(candidate)}>
                                Vote for {candidate.name}
                            </button>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
