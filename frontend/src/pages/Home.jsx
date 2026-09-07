import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { fetchCurrentStudent, logoutStudent } from "../utils/studentSession";
import { fetchVotingTime, formatRemainingTime } from "../utils/votingTime";
import "./Home.css";

// Importing images from pages/img/
import logo1 from "./img/logo1.png";
import king from "./img/king.png";
import queen from "./img/queen.png";

function Home() {
    const navigate = useNavigate();
    const [student, setStudent] = useState(null);
    const [loading, setLoading] = useState(true);
    const [showLogoutWarning, setShowLogoutWarning] = useState(false);
    const [votingSchedule, setVotingSchedule] = useState({ deadline: "", isClosed: false });
    const [countdown, setCountdown] = useState(null);

    useEffect(() => {
        async function checkSession() {
            const [currentStudent, timeData] = await Promise.all([
                fetchCurrentStudent(),
                fetchVotingTime()
            ]);
            if (!currentStudent) {
                navigate("/welcome");
                return;
            }
            setStudent(currentStudent);
            if (timeData) {
                setVotingSchedule(timeData);
                if (timeData.deadline) {
                    setCountdown(formatRemainingTime(timeData.deadline));
                }
            }
            setLoading(false);
        }
        checkSession();
    }, [navigate]);

    useEffect(() => {
        if (!votingSchedule?.deadline) return;
        const interval = setInterval(() => {
            const remaining = formatRemainingTime(votingSchedule.deadline);
            setCountdown(remaining);
        }, 1000);
        return () => clearInterval(interval);
    }, [votingSchedule]);

    const isVotingClosed = Boolean(
        votingSchedule?.votingClosed || votingSchedule?.isClosed || (countdown && countdown.expired)
    );

    const handleLogout = async () => {
        await logoutStudent();
        navigate("/welcome");
    };

    if (loading) {
        return (
            <div className="app-container" style={{ display: "grid", placeItems: "center" }}>
                <p style={{ color: "#D4AF37", fontSize: "18px" }}>Loading student session...</p>
            </div>
        );
    }
    
    return (
        <div className="app-container">
            <header className="header">
                <div className="header-logo">
                    <img src={logo1} className="logo" alt="University logo" />
                </div>
                <div className="header-title">
                    <h3>FRESHERS' WELCOME VOTING</h3>
                </div>
            </header>

            <main className="page-content home-page">
                {student && (
                    <section className={`student-status-card ${student.hasVoted ? "is-complete" : "is-eligible"}`}>
                        <div className="student-status-identity">
                            <span className="student-avatar" aria-hidden="true">
                                {String(student.username || "S").charAt(0).toUpperCase()}
                            </span>
                            <div className="student-status-copy">
                                <span className="student-status-label">Signed in as</span>
                                <strong>{student.username}</strong>
                                <small>{student.major}</small>
                            </div>
                        </div>
                        <div className="student-status-actions">
                            {isVotingClosed ? (
                                <span className="eligibility-badge is-closed-badge" style={{ background: "rgba(239, 68, 68, 0.18)", borderColor: "rgba(239, 68, 68, 0.45)", color: "#fca5a5" }}>
                                    <i className="fa-solid fa-lock" aria-hidden="true" />
                                    <span>Voting closed</span>
                                </span>
                            ) : votingSchedule?.deadline && countdown && !countdown.expired ? (
                                <span className="eligibility-badge is-timer-badge" style={{ background: "rgba(234, 179, 8, 0.18)", borderColor: "rgba(234, 179, 8, 0.45)", color: "#fef08a" }}>
                                    <i className="fa-solid fa-clock" aria-hidden="true" />
                                    <span>Closes in: {countdown.text}</span>
                                </span>
                            ) : null}

                            <span className="eligibility-badge">
                                <i className={student.hasVoted ? "fa-solid fa-circle-check" : "fa-solid fa-check"} aria-hidden="true" />
                                <span>{student.hasVoted ? "Vote submitted" : "Eligible to vote"}</span>
                            </span>
                            <button
                                type="button"
                                onClick={() => setShowLogoutWarning(true)}
                                className="student-logout-button"
                            >
                                <i className="fa-solid fa-arrow-right-from-bracket" aria-hidden="true" />
                                Logout
                            </button>
                        </div>
                    </section>
                )}

                {showLogoutWarning && (
                    <div className="logout-warning-backdrop" role="presentation" onMouseDown={() => setShowLogoutWarning(false)}>
                        <section
                            className="logout-warning-dialog"
                            role="alertdialog"
                            aria-modal="true"
                            aria-labelledby="logout-warning-title"
                            aria-describedby="logout-warning-description"
                            onMouseDown={(event) => event.stopPropagation()}
                        >
                            <span className="logout-warning-icon" aria-hidden="true">
                                <i className="fa-solid fa-triangle-exclamation" />
                            </span>
                            <div>
                                <span className="logout-warning-label">Session warning</span>
                                <h2 id="logout-warning-title">Are you sure you want to log out?</h2>
                                <p id="logout-warning-description">
                                    You will need to verify your account again before returning to the voting page.
                                </p>
                            </div>
                            <div className="logout-warning-actions">
                                <button type="button" className="logout-cancel-button" onClick={() => setShowLogoutWarning(false)}>
                                    Stay signed in
                                </button>
                                <button type="button" className="logout-confirm-button" onClick={handleLogout}>
                                    <i className="fa-solid fa-arrow-right-from-bracket" aria-hidden="true" />
                                    Log out
                                </button>
                            </div>
                        </section>
                    </div>
                )}

                <section className="hero-section">
                    <div className="hero-card">
                        <div className="crown">
                            <i className="fa-solid fa-crown"></i>
                        </div>
                        <div className="welcome-script">Welcome to</div>
                        <div className="main-title">FRESHERS' WELCOME</div>
                    </div>
                </section>

                <section className="tagline-section">
                    <div className="tagline-cursive">Vote for Your Favorites</div>
                    <div className="voting-text">
                        Cast Your Vote
                        <br />
                        
                    </div>
                    <p className="description-cursive">
                        
                        <br />
                        Shape the highlight of our university welcome event with your choice.
                    </p>
                </section>

                <section className="cards-container">
                    <Link to="/boy" className="category-card">
                        <img src={king} className="logo-kq" alt="Vote for King" />
                        <span>Vote for Your Choice (Boy)</span>
                    </Link>
                    <Link to="/girl" className="category-card">
                        <img src={queen} className="logo-kq" alt="Vote for Queen" />
                        <span>Vote for Your Choice (Girl)</span>
                    </Link>
                </section>
            </main>
        </div>
    );
}

export default Home;

