import { useEffect, useMemo, useState } from "react";
import QRCode from "qrcode";
import "./Dashboard.css";
import { getVoteRatio, setVoteRatio } from "../utils/voteStore";

const API_URL = "/api/candidates";
const TITLES_API_URL = "/api/titles";

function Dashboard() {
    const [candidates, setCandidates] = useState([]);
    const [voteRatio, setVoteRatioState] = useState(getVoteRatio());
    const [formData, setFormData] = useState({
        no: "",
        name: "",
        gender: "Male",
        age: "",
        major: "",
        talent: "",
        bio: "",
        photo: "",
    });
    const [titles, setTitles] = useState([]);
    const [isTitleDialogOpen, setIsTitleDialogOpen] = useState(false);
    const [newTitle, setNewTitle] = useState({ name: "", gender: "Male" });
    const [editingId, setEditingId] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [successMessage, setSuccessMessage] = useState("");
    const [selectedFileName, setSelectedFileName] = useState("");
    const [teacherToken, setTeacherToken] = useState("");
    const [teacherQrCode, setTeacherQrCode] = useState("");
    const [teacherTokenExpiresAt, setTeacherTokenExpiresAt] = useState("");
    const [teacherTokenCount, setTeacherTokenCount] = useState(0);
    const [teacherTokenHistory, setTeacherTokenHistory] = useState([]);
    const [teacherTokenQrPreviews, setTeacherTokenQrPreviews] = useState({});
    const [isGeneratingTeacherToken, setIsGeneratingTeacherToken] = useState(false);
    const [backendVoteTotals, setBackendVoteTotals] = useState({ student: 0, teacher: 0, total: 0 });
    const [resultLeaders, setResultLeaders] = useState([]);
    const [isRefreshing, setIsRefreshing] = useState(false);

    const loadCandidates = async () => {
        try {
            const response = await fetch(API_URL);

            if (!response.ok) {
                throw new Error("Unable to load candidates");
            }

            const data = await response.json();
            setCandidates(data);
            setError("");
        } catch (loadError) {
            setError(loadError.message || "Failed to load candidates.");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadCandidates();
        loadTitles();
        loadTeacherTokens();
        loadVoteSummary();
        loadPublishedResults();
    }, []);

    const loadVoteSummary = async () => {
        try {
            const response = await fetch(`${TITLES_API_URL}/summary`);
            if (!response.ok) {
                throw new Error("Unable to load vote summary.");
            }
            const data = await response.json();
            setBackendVoteTotals({
                student: Number(data.student || 0),
                teacher: Number(data.teacher || 0),
                total: Number(data.total || 0),
            });
        } catch (loadError) {
            console.error(loadError);
        }
    };

    const loadTitles = async () => {
        try {
            const response = await fetch(TITLES_API_URL);
            if (!response.ok) throw new Error("Unable to load titles.");
            setTitles(await response.json());
        } catch (loadError) {
            setError(loadError.message || "Unable to load titles.");
        }
    };

    const dashboardSections = useMemo(() => {
        const genders = ["Male", "Female"];

        return genders.map((gender) => ({
            name: gender,
            candidates: (candidates || []).filter((candidate) => candidate.gender && candidate.gender.toLowerCase() === gender.toLowerCase())
        }));
    }, [candidates]);

    const resolveImageUrl = (photoValue) => {
        if (!photoValue) {
            return "";
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

    const handleChange = (event) => {
        const { name, value } = event.target;
        setFormData((previous) => ({ ...previous, [name]: value }));
    };

    const handleAddTitle = async () => {
        const titleName = newTitle.name.trim();

        if (!titleName) {
            setError("Please enter a title name.");
            return;
        }

        if (titles.some((title) => title.name.toLowerCase() === titleName.toLowerCase())) {
            setError("That title already exists.");
            return;
        }

        try {
            const response = await fetch(TITLES_API_URL, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ name: titleName, gender: newTitle.gender }),
            });
            const responseText = await response.text();
            if (!response.ok) throw new Error(responseText || "Unable to add title.");
            setTitles((previous) => [...previous, JSON.parse(responseText)]);
            setNewTitle({ name: "", gender: "Male" });
            setIsTitleDialogOpen(false);
            setError("");
            await loadCandidates();
        } catch (addError) {
            setError(addError.message || "Unable to add title.");
        }
    };

    const handleDeleteTitle = async (title) => {
        const confirmed = window.confirm(`Delete the “${title.name}” title? This may also remove its voting data.`);
        if (!confirmed) {
            return;
        }

        try {
            const response = await fetch(`${TITLES_API_URL}/${title.id}`, { method: "DELETE" });
            if (!response.ok) throw new Error("Unable to delete title.");
            setTitles((previous) => previous.filter((item) => item.id !== title.id));
            await loadCandidates();
        } catch (deleteError) {
            setError(deleteError.message || "Unable to delete title.");
        }
    };

    const loadPublishedResults = async () => {
        try {
            const response = await fetch(`${TITLES_API_URL}/result-leaders`);
            if (!response.ok) {
                throw new Error("Unable to load published results.");
            }
            setResultLeaders(await response.json());
        } catch (loadError) {
            setError(loadError.message || "Unable to load published results.");
        }
    };

    const publishResultLeader = async (row) => {
        if (!row.candidateId) {
            return;
        }

        const endpoint = `${TITLES_API_URL}/${encodeURIComponent(row.title)}/result-leader`;

        try {
            const response = await fetch(endpoint, {
                method: "PUT",
                credentials: "include",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ studentWeight: voteRatio.student, teacherWeight: voteRatio.teacher }),
            });
            if (!response.ok) {
                throw new Error(await response.text() || "Unable to update the published result.");
            }
            await loadPublishedResults();
            setSuccessMessage("Weighted title leader published.");
        } catch (publishError) {
            setError(publishError.message || "Unable to update the published result.");
        }
    };

    const removeResultLeader = async (row) => {
        try {
            const response = await fetch(`${TITLES_API_URL}/${encodeURIComponent(row.title)}/result-leader`, {
                method: "DELETE",
                credentials: "include",
            });
            if (!response.ok) {
                throw new Error(await response.text() || "Unable to remove the published result.");
            }
            await loadPublishedResults();
            setSuccessMessage("Title result removed.");
        } catch (removeError) {
            setError(removeError.message || "Unable to remove the published result.");
        }
    };

    const handleVoteRatioChange = (group, value) => {
        const numericValue = Number(value);

        if (Number.isNaN(numericValue)) {
            return;
        }

        const clampedValue = Math.min(100, Math.max(0, numericValue));
        const nextRatio = group === "student"
            ? { student: clampedValue, teacher: 100 - clampedValue }
            : { student: 100 - clampedValue, teacher: clampedValue };

        setVoteRatioState(nextRatio);
        setVoteRatio(nextRatio);
    };

    const generateTeacherToken = async () => {
        try {
            setIsGeneratingTeacherToken(true);
            setError("");

            const response = await fetch("/api/teacher/token", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                credentials: "include",
            });

            if (!response.ok) {
                const message = await response.text();
                throw new Error(message || "Unable to generate teacher token.");
            }

            const data = await response.json();
            const teacherLandingUrl = `${window.location.origin}/teacher-vote?token=${encodeURIComponent(data.token)}`;
            const qrDataUrl = await QRCode.toDataURL(teacherLandingUrl, {
                width: 280,
                margin: 1,
                color: {
                    dark: "#07162d",
                    light: "#ffffff",
                },
            });

            setTeacherToken(data.token);
            setTeacherQrCode(qrDataUrl);
            setTeacherTokenExpiresAt(data.expiresAt || "15 minutes");
            await loadTeacherTokens();
            setSuccessMessage("Teacher QR code generated successfully.");
        } catch (tokenError) {
            setSuccessMessage("");
            setError(tokenError.message || "Unable to generate teacher token.");
        } finally {
            setIsGeneratingTeacherToken(false);
        }
    };

    const downloadTeacherQrCode = () => {
        if (!teacherQrCode) {
            return;
        }

        const link = document.createElement("a");
        const safeTokenName = (teacherToken || "teacher-voting-token").replace(/[^a-z0-9-_]/gi, "-").toLowerCase();
        link.href = teacherQrCode;
        link.download = `${safeTokenName || "teacher-voting-token"}.png`;
        document.body.appendChild(link);
        link.click();
        link.remove();
    };

    const deleteTeacherToken = async (tokenId) => {
        try {
            const response = await fetch(`/api/teacher/tokens/${tokenId}`, {
                method: "DELETE",
                credentials: "include",
            });

            if (!response.ok) {
                throw new Error("Unable to delete teacher token.");
            }

            await loadTeacherTokens();
            if (teacherToken && teacherTokenHistory.some((item) => item.id === tokenId)) {
                const nextActive = teacherTokenHistory.filter((item) => item.id !== tokenId);
                if (nextActive.length > 0) {
                    setTeacherToken(nextActive[0].token);
                    setTeacherTokenExpiresAt(nextActive[0].expiresAt);
                } else {
                    setTeacherToken("");
                    setTeacherTokenExpiresAt("");
                    setTeacherQrCode("");
                }
            }
            setSuccessMessage("Teacher token deleted successfully.");
        } catch (deleteError) {
            setError(deleteError.message || "Unable to delete teacher token.");
        }
    };

    const downloadTokenQrCode = async (tokenValue) => {
        if (!tokenValue) {
            return;
        }

        try {
            const landingUrl = `${window.location.origin}/teacher-vote?token=${encodeURIComponent(tokenValue)}`;
            const qrDataUrl = await QRCode.toDataURL(landingUrl, {
                width: 280,
                margin: 1,
                color: {
                    dark: "#07162d",
                    light: "#ffffff",
                },
            });

            const link = document.createElement("a");
            const safeTokenName = tokenValue.replace(/[^a-z0-9-_]/gi, "-").toLowerCase();
            link.href = qrDataUrl;
            link.download = `${safeTokenName || "teacher-voting-token"}.png`;
            document.body.appendChild(link);
            link.click();
            link.remove();
        } catch (downloadError) {
            setError(downloadError.message || "Unable to download teacher QR code.");
        }
    };

    const handlePhotoChange = (event) => {
        const file = event.target.files?.[0];

        if (!file) {
            setSelectedFileName("");
            setFormData((previous) => ({ ...previous, photo: "" }));
            return;
        }

        const isImage = file.type.startsWith("image/") || /\.(png|jpe?g|gif|bmp|webp|svg)$/i.test(file.name);

        if (!isImage) {
            setError("Please choose a valid image file.");
            event.target.value = "";
            setSelectedFileName("");
            setFormData((previous) => ({ ...previous, photo: "" }));
            return;
        }

        const maxSizeInBytes = 20 * 1024 * 1024;
        if (file.size > maxSizeInBytes) {
            setError("Please choose an image smaller than 20 MB.");
            event.target.value = "";
            setSelectedFileName("");
            setFormData((previous) => ({ ...previous, photo: "" }));
            return;
        }

        setSelectedFileName(file.name);

        const reader = new FileReader();
        reader.onload = () => {
            setError("");
            setFormData((previous) => ({ ...previous, photo: reader.result }));
        };
        reader.onerror = () => {
            setError("Failed to read the selected photo file.");
        };
        reader.readAsDataURL(file);
    };

    const resetForm = () => {
        setFormData({
            no: "",
            name: "",
            gender: "Male",
            age: "",
            major: "",
            talent: "",
            bio: "",
            photo: "",
        });
        setSelectedFileName("");
        setEditingId(null);
    };

    const loadTeacherTokens = async () => {
        try {
            const response = await fetch("/api/teacher/tokens", { credentials: "include" });
            if (!response.ok) {
                throw new Error("Unable to load teacher tokens.");
            }

            const data = await response.json();
            setTeacherTokenHistory(data || []);
            setTeacherTokenCount((data || []).length);

            const previews = {};
            for (const tokenItem of data || []) {
                try {
                    const landingUrl = `${window.location.origin}/teacher-vote?token=${encodeURIComponent(tokenItem.token)}`;
                    const qrDataUrl = await QRCode.toDataURL(landingUrl, {
                        width: 120,
                        margin: 1,
                        color: {
                            dark: "#07162d",
                            light: "#ffffff",
                        },
                    });
                    previews[tokenItem.id] = qrDataUrl;
                } catch {
                    previews[tokenItem.id] = "";
                }
            }
            setTeacherTokenQrPreviews(previews);

            if (data && data.length > 0) {
                const newest = data[0];
                setTeacherToken(newest.token || "");
                setTeacherTokenExpiresAt(newest.expiresAt || "");
            }
        } catch (loadError) {
            console.error(loadError);
        }
    };

    const handleSubmit = async (event) => {
        event.preventDefault();

        const candidateName = formData.name.trim();
        const candidateNo = Number(formData.no) || 0;

        if (!candidateName) {
            setError("Candidate name is required.");
            return;
        }

        if (candidateNo < 1) {
            setError("Please enter a candidate number.");
            return;
        }

        const categoriesForGender = titles
            .filter((title) => title.gender === formData.gender)
            .map((title) => title.name);

        if (categoriesForGender.length === 0) {
            setError(`Please add at least one ${formData.gender.toLowerCase()} title first.`);
            return;
        }

        try {
            const candidateToEdit = editingId !== null
                ? candidates.find((candidate) => candidate.id === editingId)
                : null;

            const payload = {
                no: candidateNo,
                name: candidateName,
                gender: formData.gender,
                categories: categoriesForGender,
                age: Number(formData.age) || 0,
                major: formData.major.trim(),
                talent: formData.talent.trim(),
                bio: formData.bio.trim(),
                photo: formData.photo.trim(),
                votes: candidateToEdit ? Number(candidateToEdit.votes || 0) : 0,
            };

            const requestOptions = {
                method: editingId !== null ? "PUT" : "POST",
                headers: { "Content-Type": "application/json" },
                credentials: "include",
                body: JSON.stringify(payload),
            };

            const endpoint = editingId !== null ? `${API_URL}/${editingId}` : API_URL;
            const response = await fetch(endpoint, requestOptions);
            const responseText = await response.text();

            if (!response.ok) {
                const action = editingId !== null ? "update" : "add";
                const message = responseText || `Unable to ${action} candidate (HTTP ${response.status}).`;
                throw new Error(message);
            }

            const successText = editingId !== null ? "Candidate updated successfully." : "Candidate uploaded successfully.";
            resetForm();
            setSuccessMessage(successText);
            setError("");
            await loadCandidates();
        } catch (submitError) {
            console.error("Candidate save failed:", submitError);
            setSuccessMessage("");
            setError(submitError.message || "Something went wrong while saving the candidate.");
        }
    };

    const handleEdit = (candidate) => {
        setEditingId(candidate.id);
        setFormData({
            no: String(candidate.no ?? ""),
            name: candidate.name,
            gender: candidate.gender || "Male",
            age: String(candidate.age ?? ""),
            major: candidate.major || "",
            talent: candidate.talent || "",
            bio: candidate.bio || "",
            photo: candidate.photo || "",
        });
    };

    const handleDelete = async (candidateId) => {
        const candidate = candidates.find((item) => item.id === candidateId);
        const candidateName = candidate?.name || "this candidate";

        const confirmed = window.confirm(`Are you sure you want to delete ${candidateName}? This action cannot be undone.`);
        if (!confirmed) {
            return;
        }

        try {
            const response = await fetch(`${API_URL}/${candidateId}`, { method: "DELETE" });

            if (!response.ok) {
                throw new Error("Unable to delete candidate.");
            }

            if (editingId === candidateId) {
                resetForm();
            }

            await loadCandidates();
        } catch (deleteError) {
            setError(deleteError.message || "Could not delete candidate.");
        }
    };

    const studentVotes = Number(backendVoteTotals.student || 0);
    const teacherVotes = Number(backendVoteTotals.teacher || 0);
    // Display raw counts but use configured voteRatio for percentage split (sum = 100%)
    const studentShare = voteRatio.student;
    const teacherShare = voteRatio.teacher;

    const getTitleWeightedScore = (candidate, titleName) => {
        const findVote = (voteMap) => {
            const entry = Object.entries(voteMap || {}).find(
                ([key]) => String(key).toLowerCase() === String(titleName).toLowerCase()
            );
            return Number(entry?.[1] || 0);
        };

        const titleCandidates = (candidates || []).filter((item) =>
            item?.titles?.some((title) => String(title).toLowerCase() === String(titleName).toLowerCase())
        );
        const totalStudentVotes = titleCandidates.reduce(
            (sum, item) => sum + findVote(item.titleStudentVoteCounts), 0
        );
        const totalTeacherVotes = titleCandidates.reduce(
            (sum, item) => sum + findVote(item.titleTeacherVoteCounts), 0
        );
        const studentScore = totalStudentVotes === 0
            ? 0
            : (findVote(candidate.titleStudentVoteCounts) / totalStudentVotes) * voteRatio.student;
        const teacherScore = totalTeacherVotes === 0
            ? 0
            : (findVote(candidate.titleTeacherVoteCounts) / totalTeacherVotes) * voteRatio.teacher;

        return studentScore + teacherScore;
    };

    const getTitleLeader = (titleName) => {
        const titleCandidates = (candidates || []).filter((candidate) => {
            if (!candidate || !candidate.titles) {
                return false;
            }
            return candidate.titles.some((title) => title && title.toLowerCase() === String(titleName).toLowerCase());
        });

        if (titleCandidates.length === 0) {
            return null;
        }

        return titleCandidates.reduce((leader, candidate) => {
            const currentScore = getTitleWeightedScore(candidate, titleName);
            const leaderScore = getTitleWeightedScore(leader, titleName);
            return currentScore > leaderScore ? candidate : leader;
        }, titleCandidates[0]);
    };

    const titleLeaderRows = (titles || []).map((title) => {
        const leader = getTitleLeader(title.name);
        return {
            title: title.name,
            leaderName: leader?.name || "No leader yet",
            weightedScore: leader ? getTitleWeightedScore(leader, title.name) : 0,
            candidateId: leader?.id || null,
            isAddedToResult: resultLeaders.some((item) => item.title.toLowerCase() === title.name.toLowerCase()),
        };
    });

    const refreshDashboard = async () => {
        setIsRefreshing(true);
        setError("");
        try {
            await Promise.all([
                loadCandidates(),
                loadTitles(),
                loadTeacherTokens(),
                loadVoteSummary(),
                loadPublishedResults(),
            ]);
        } finally {
            setIsRefreshing(false);
        }
    };

    return (
        <div className="dashboard-page">
            <div className="dashboard-header">
                <div className="dashboard-heading">
                    <p className="dashboard-kicker">Admin Dashboard</p>
                    <h1>Election Control Center</h1>
                    <p className="dashboard-subtitle">Manage candidates, voting weights, teacher access, and published winners from one workspace.</p>
                </div>
                <div className="dashboard-header-tools">
                    <div className="dashboard-header-status">
                        <span className="live-dot" aria-hidden="true" />
                        <div>
                            <small>System status</small>
                            <strong>Voting is live</strong>
                        </div>
                    </div>
                    <button type="button" className="dashboard-refresh-button" onClick={refreshDashboard} disabled={isRefreshing}>
                        <i className={`fa-solid fa-rotate ${isRefreshing ? "is-spinning" : ""}`} aria-hidden="true" />
                        {isRefreshing ? "Refreshing" : "Refresh data"}
                    </button>
                </div>
            </div>

            {(error || successMessage) && (
                <div className={`dashboard-notice ${error ? "error" : "success"}`} role={error ? "alert" : "status"}>
                    <i className={`fa-solid ${error ? "fa-triangle-exclamation" : "fa-circle-check"}`} aria-hidden="true" />
                    <span>{error || successMessage}</span>
                    <button type="button" onClick={() => { setError(""); setSuccessMessage(""); }} aria-label="Dismiss notification">×</button>
                </div>
            )}

            <div className="dashboard-overview-grid">
                <div className="overview-card"><span>Total votes</span><strong>{studentVotes + teacherVotes}</strong><small>Across all voters</small></div>
                <div className="overview-card"><span>Candidates</span><strong>{candidates.length}</strong><small>Male and female</small></div>
                <div className="overview-card"><span>Election titles</span><strong>{titles.length}</strong><small>Configured categories</small></div>
                <div className="overview-card"><span>Published winners</span><strong>{resultLeaders.length}</strong><small>Visible on results</small></div>
            </div>

            <section className="leaderboard-panel">
                <div className="panel-heading-row">
                    <div>
                        <p className="dashboard-kicker">Title Leaderboard</p>
                        <h2>Top candidate for each title</h2>
                    </div>
                    <span className="panel-count">{titleLeaderRows.length} titles</span>
                </div>

                <div className="leaderboard-table-wrap">
                    <table className="leaderboard-table">
                        <thead>
                            <tr>
                                <th>Title</th>
                                <th>Current leader</th>
                                <th>Weighted score</th>
                                <th>Result control</th>
                            </tr>
                        </thead>
                        <tbody>
                            {titleLeaderRows.length === 0 && (
                                <tr>
                                    <td colSpan="4" className="leaderboard-empty">Add an election title to start tracking leaders.</td>
                                </tr>
                            )}
                            {titleLeaderRows.map((row) => (
                                <tr key={row.title}>
                                    <td><span className="title-table-name">{row.title}</span></td>
                                    <td>{row.leaderName}</td>
                                    <td><strong className="weighted-score">{row.weightedScore.toFixed(2)}%</strong></td>
                                    <td><div className="leaderboard-actions">
                                        <button
                                            type="button"
                                            className="primary-button"
                                            disabled={!row.candidateId || row.isAddedToResult}
                                            onClick={() => publishResultLeader(row)}
                                        >
                                            {row.isAddedToResult ? "Published" : "Publish winner"}
                                        </button>
                                        <button
                                            type="button"
                                            className="delete-button"
                                            disabled={!row.isAddedToResult}
                                            onClick={() => removeResultLeader(row)}
                                        >
                                            Remove
                                        </button>
                                    </div></td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </section>

            <div className="vote-summary-grid">
                <div className="vote-summary-card student-card">
                    <div className="vote-summary-header">
                        <span>Student Votes</span>
                        <strong>{studentVotes}</strong>
                    </div>
                    <div className="vote-summary-meta">
                        <span>{Math.round(studentShare)}% of total</span>
                    </div>
                    <div className="progress-bar vote-split-bar" aria-label="Student vote share">
                        <span style={{ width: `${studentShare}%` }} />
                    </div>
                </div>

                <div className="vote-summary-card teacher-card">
                    <div className="vote-summary-header">
                        <span>Teacher Votes</span>
                        <strong>{teacherVotes}</strong>
                    </div>
                    <div className="vote-summary-meta">
                        <span>{Math.round(teacherShare)}% of total</span>
                    </div>
                    <div className="progress-bar vote-split-bar teacher-split-bar" aria-label="Teacher vote share">
                        <span style={{ width: `${teacherShare}%` }} />
                    </div>
                </div>
            </div>

            <div className="vote-split-editor">
                <div className="split-editor-copy">
                    <p className="dashboard-kicker">Live weighting</p>
                    <h2>Voting influence</h2>
                    <p>Adjust how much student and teacher votes contribute to each title result.</p>
                </div>
                <div className="split-control">
                    <label htmlFor="student-ratio">Student share</label>
                    <div className="split-control-row">
                        <input id="student-ratio" type="range" min="0" max="100" value={voteRatio.student} onChange={(event) => handleVoteRatioChange("student", event.target.value)} />
                        <strong>{voteRatio.student}%</strong>
                    </div>
                </div>

                <div className="split-control">
                    <label htmlFor="teacher-ratio">Teacher share</label>
                    <div className="split-control-row">
                        <input id="teacher-ratio" type="range" min="0" max="100" value={voteRatio.teacher} onChange={(event) => handleVoteRatioChange("teacher", event.target.value)} />
                        <strong>{voteRatio.teacher}%</strong>
                    </div>
                </div>
            </div>

            <div className="teacher-token-panel">
                <div className="teacher-token-header">
                    <div>
                        <p className="dashboard-kicker">Teacher Voting Access</p>
                        <h2>Generate Voting Token</h2>
                    </div>
                    <div className="teacher-token-chip">Generated: {teacherTokenCount}</div>
                </div>

                <div className="teacher-token-box">
                    <div className="teacher-token-left">
                        <div className="teacher-token-label">Latest token</div>
                        <div className="teacher-token-value">{teacherToken || "No token generated yet"}</div>
                        <div className="teacher-token-meta">Valid until: {teacherTokenExpiresAt || "Waiting for generation"}</div>
                    </div>

                    <div className="teacher-token-actions">
                        <button type="button" className="primary-button" onClick={generateTeacherToken} disabled={isGeneratingTeacherToken}>
                            {isGeneratingTeacherToken ? "Generating..." : "Generate Token"}
                        </button>
                        <button type="button" className="secondary-button" onClick={downloadTeacherQrCode} disabled={!teacherQrCode}>
                            Download Latest QR
                        </button>
                    </div>
                </div>

                {teacherTokenHistory.length > 0 && (
                    <div className="teacher-token-history">
                        <div className="teacher-token-history-header">
                            <h3>Generated Tokens</h3>
                            <span>{teacherTokenHistory.length} total</span>
                        </div>

                        <div className="teacher-token-history-list">
                            {teacherTokenHistory.map((tokenItem) => (
                                <div key={tokenItem.id} className="teacher-token-history-item">
                                    <div className="teacher-token-history-main">
                                        {teacherTokenQrPreviews[tokenItem.id] ? (
                                            <img src={teacherTokenQrPreviews[tokenItem.id]} alt="Token QR" className="teacher-token-history-qr" />
                                        ) : null}
                                        <strong>{tokenItem.token}</strong>
                                        <small>Expires: {tokenItem.expiresAt}</small>
                                    </div>
                                    <div className="teacher-token-history-badges">
                                        <span className={tokenItem.used ? "token-badge used" : "token-badge active"}>
                                            {tokenItem.used ? "Used" : "Active"}
                                        </span>
                                        <button type="button" className="secondary-button token-download-button" onClick={() => downloadTokenQrCode(tokenItem.token)}>
                                            Download QR
                                        </button>
                                        <button type="button" className="delete-button token-delete-button" onClick={() => deleteTeacherToken(tokenItem.id)}>
                                            Delete
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>

            <div className="dashboard-layout">
                <div className="title-category-box dashboard-workspace-card">
                    <div className="title-category-header">
                        <div>
                            <span>Title Categories</span>
                            <small>{titles.length} added</small>
                        </div>
                        <button type="button" className="add-title-button" onClick={() => { setIsTitleDialogOpen(true); setError(""); }}>
                            + Add Title
                        </button>
                    </div>
                    {titles.length === 0 ? (
                        <p className="empty-title-message">No titles added yet.</p>
                    ) : (
                        <div className="title-category-grid">
                            {titles.map((title) => (
                                <div key={title.id} className="title-option selected">
                                    <div className="title-option-text">
                                        <span>{title.name}</span>
                                        <small>{title.gender}</small>
                                    </div>
                                    <button type="button" className="remove-title-button" onClick={() => handleDeleteTitle(title)} aria-label={`Remove ${title.name}`}>
                                        ×
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}
                    {isTitleDialogOpen && (
                        <div className="add-title-form">
                            <label>
                                Title
                                <input
                                    type="text"
                                    value={newTitle.name}
                                    onChange={(event) => setNewTitle((previous) => ({ ...previous, name: event.target.value }))}
                                    placeholder="e.g. King"
                                    autoFocus
                                />
                            </label>
                            <fieldset>
                                <legend>Title gender</legend>
                                <label className="gender-choice">
                                    <input type="radio" name="title-gender" value="Male" checked={newTitle.gender === "Male"} onChange={(event) => setNewTitle((previous) => ({ ...previous, gender: event.target.value }))} />
                                    Male
                                </label>
                                <label className="gender-choice">
                                    <input type="radio" name="title-gender" value="Female" checked={newTitle.gender === "Female"} onChange={(event) => setNewTitle((previous) => ({ ...previous, gender: event.target.value }))} />
                                    Female
                                </label>
                            </fieldset>
                            <div className="title-form-actions">
                                <button type="button" className="primary-button" onClick={handleAddTitle}>Add</button>
                                <button type="button" className="secondary-button" onClick={() => setIsTitleDialogOpen(false)}>Cancel</button>
                            </div>
                        </div>
                    )}
                </div>

                <form className="candidate-form" onSubmit={handleSubmit}>
                    <h2>{editingId !== null ? "Edit Candidate" : "Add Candidate"}</h2>

                    <div className="form-grid">
                        <label>
                            No.
                            <input type="number" name="no" value={formData.no} onChange={handleChange} placeholder="1" min="1" />
                        </label>

                        <label>
                            Name
                            <input type="text" name="name" value={formData.name} onChange={handleChange} placeholder="Enter candidate name" required />
                        </label>

                        <label>
                            Gender
                            <select name="gender" value={formData.gender} onChange={handleChange}>
                                <option value="Male">Male</option>
                                <option value="Female">Female</option>
                            </select>
                        </label>

                        <label>
                            Age
                            <input type="number" name="age" value={formData.age} onChange={handleChange} placeholder="Enter Age" min="18" max="30" required />
                        </label>

                        <label>
                            Major
                            <input type="text" name="major" value={formData.major} onChange={handleChange} placeholder="Enter Major" required />
                        </label>

                        <label>
                            Talent
                            <input type="text" name="talent" value={formData.talent} onChange={handleChange} placeholder="Enter Talent" required />
                        </label>
                    </div>

                    <label>
                        Bio
                        <textarea name="bio" value={formData.bio} onChange={handleChange} placeholder="Bio..." rows="3" />
                    </label>

                    <label className="photo-upload">
                        <span className="photo-upload-title">Photo (all image types)</span>
                        <span className="photo-upload-box">
                            <span className="upload-icon">⇪</span>
                            <span>{selectedFileName || (formData.photo ? "Change photo" : "Upload candidate photo")}</span>
                        </span>
                        <input type="file" accept="image/*" onChange={handlePhotoChange} className="photo-input" />
                    </label>

                    {formData.photo && (
                        <div className="photo-preview-wrap">
                            <img src={resolveImageUrl(formData.photo)} alt="Selected candidate preview" className="candidate-photo preview-photo" />
                        </div>
                    )}

                    <div className="form-actions">
                        <button type="submit" className="primary-button">
                            {editingId !== null ? "Save Changes" : "Add Candidate"}
                        </button>

                        {editingId !== null && (
                            <button type="button" className="secondary-button" onClick={resetForm}>
                                Cancel
                            </button>
                        )}
                    </div>

                </form>

                <div className="sections-panel">
                    {loading ? (
                        <div className="candidate-card loading-card">Loading candidates...</div>
                    ) : (
                        dashboardSections.map((section) => {
                            const sectionName = section.name;
                            const sectionCandidates = section.candidates || [];
                            const sectionVotes = sectionCandidates.reduce((sum, candidate) => sum + Number(candidate.votes || 0), 0);
                            const leadingCandidate = sectionCandidates.reduce((leader, candidate) => {
                                if (!leader) return candidate;
                                return Number(candidate.votes || 0) > Number(leader.votes || 0) ? candidate : leader;
                            }, null);
                            return (
                                <div className="section-card" key={sectionName}>
                                    <div className="section-header">
                                        <div>
                                            <h2>{sectionName} Candidates</h2>
                                            {leadingCandidate && (
                                                <div className="leader-summary">
                                                    <span className="leader-badge">Current Leader</span>
                                                    <small className="leading-candidate">
                                                        {leadingCandidate.name} • {leadingCandidate.votes || 0} votes
                                                    </small>
                                                </div>
                                            )}
                                        </div>
                                        <span>{sectionCandidates.length} candidate(s)</span>
                                    </div>

                                    {sectionCandidates.length === 0 ? (
                                        <p className="empty-section">No candidates in this section yet.</p>
                                    ) : (
                                        <div className="section-list">
                                            {sectionCandidates.map((candidate) => {
                                                const percentage = sectionVotes === 0 ? 0 : (Number(candidate.votes || 0) / sectionVotes) * 100;
                                                const isLeadingCandidate = leadingCandidate && Number(candidate.id) === Number(leadingCandidate.id);
                                                const titleList = candidate.titles && candidate.titles.length > 0
                                                    ? candidate.titles
                                                    : (titles || []).filter((title) => title.gender && title.gender.toLowerCase() === candidate.gender?.toLowerCase()).map((title) => title.name);

                                                return (
                                                    <div className={`candidate-card ${isLeadingCandidate ? "leader-card" : ""}`} key={candidate.id}>
                                                        {isLeadingCandidate && <div className="leader-crest">Current Leader</div>}
                                                        <div className="profile-row">
                                                            <img src={resolveImageUrl(candidate.photo) || "https://images.unsplash.com/photo-1544005313-94ddf0286df2"} alt={candidate.name} className="candidate-photo" />
                                                            <div className="profile-info">
                                                                <div className="candidate-name-row">
                                                                    <span className="candidate-no">#{candidate.no ?? "-"}</span>
                                                                    <h3>{candidate.name}</h3>
                                                                </div>
                                                                <p className="candidate-meta">{candidate.gender} • {candidate.age} yrs • {candidate.major}</p>
                                                                <p className="candidate-meta">Talent: {candidate.talent}</p>
                                                                <p className="candidate-bio">{candidate.bio}</p>
                                                            </div>
                                                        </div>

                                                        <div className="candidate-titles-row" style={{ display: "flex", flexWrap: "wrap", gap: "8px", margin: "12px 0" }}>
                                                            {titleList.map((title) => (
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
                                                                    {title} • S:{Number(candidate.titleStudentVoteCounts?.[title] ?? 0)} T:{Number(candidate.titleTeacherVoteCounts?.[title] ?? 0)}
                                                                </span>
                                                            ))}
                                                        </div>

                                                        <div className="candidate-stats">
                                                            <span>{candidate.votes} votes</span>
                                                            <span className={isLeadingCandidate ? "leader-share" : ""}>{isLeadingCandidate ? "Leader" : "Contestant"}</span>
                                                        </div>

                                                        <div className="progress-bar" aria-label={`${candidate.name} vote progress`}>
                                                            <span style={{ width: `${percentage}%` }} />
                                                        </div>

                                                        <div className="candidate-actions">
                                                            <button type="button" className="edit-button" onClick={() => handleEdit(candidate)}>Edit</button>
                                                            <button type="button" className="delete-button" onClick={() => handleDelete(candidate.id)}>Delete</button>
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    )}
                                </div>
                            );
                        })
                    )}
                </div>
            </div>
        </div>
    );
}

export default Dashboard;
