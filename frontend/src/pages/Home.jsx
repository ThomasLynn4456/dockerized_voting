import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { fetchCurrentStudent, logoutStudent } from "../utils/studentSession";
import "./Home.css";

// Importing images from pages/img/
import logo1 from "./img/logo1.png";
import king from "./img/king.png";
import queen from "./img/queen.png";

function Home() {
    const navigate = useNavigate();
    const [student, setStudent] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function checkSession() {
            const currentStudent = await fetchCurrentStudent();
            if (!currentStudent) {
                navigate("/welcome");
                return;
            }
            setStudent(currentStudent);
            setLoading(false);
        }
        checkSession();
    }, [navigate]);

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
                    <div style={{
                        margin: "12px 16px 0",
                        padding: "10px 16px",
                        background: "rgba(18, 53, 101, 0.75)",
                        border: "1px solid #D4AF37",
                        borderRadius: "10px",
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        color: "#ffe6a3",
                        flexWrap: "wrap",
                        gap: "8px"
                    }}>
                        <div>
                            <strong>Student:</strong> {student.username} ({student.major})
                        </div>
                        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                            <span style={{
                                padding: "4px 10px",
                                borderRadius: "20px",
                                fontSize: "13px",
                                background: student.hasVoted ? "rgba(46, 204, 113, 0.2)" : "rgba(241, 196, 15, 0.2)",
                                color: student.hasVoted ? "#2ecc71" : "#f1c40f",
                                border: student.hasVoted ? "1px solid #2ecc71" : "1px solid #f1c40f"
                            }}>
                                {student.hasVoted ? "Already Voted ✅" : "Eligible to Vote 🗳️"}
                            </span>
                            <button
                                type="button"
                                onClick={handleLogout}
                                style={{
                                    padding: "4px 12px",
                                    borderRadius: "6px",
                                    background: "rgba(212, 175, 55, 0.2)",
                                    border: "1px solid #D4AF37",
                                    color: "#ffe6a3",
                                    cursor: "pointer",
                                    fontSize: "12px",
                                    fontWeight: "bold"
                                }}
                            >
                                Logout
                            </button>
                        </div>
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

