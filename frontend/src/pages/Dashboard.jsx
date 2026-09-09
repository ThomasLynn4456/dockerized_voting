import { useEffect, useMemo, useRef, useState } from "react";
import QRCode from "qrcode";
import "./Dashboard.css";
import { getVoteRatio, setVoteRatio } from "../utils/voteStore";
import { fetchVotingTime, saveVotingTime, formatRemainingTime } from "../utils/votingTime";
import CandidateGallery from "../components/CandidateGallery";

const API_URL = "/api/candidates";
const TITLES_API_URL = "/api/titles";

function Dashboard() {
    const [candidates, setCandidates] = useState([]);
    const [voteRatio, setVoteRatioState] = useState(getVoteRatio());
    const photoInputRef = useRef(null);
    const galleryInputRef = useRef(null);
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
    const [isCandidateModalOpen, setIsCandidateModalOpen] = useState(false);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [candidateFormError, setCandidateFormError] = useState("");
    const [candidateFormSuccess, setCandidateFormSuccess] = useState("");
    const [successMessage, setSuccessMessage] = useState("");
    const [selectedFileName, setSelectedFileName] = useState("");
    const [galleryImages, setGalleryImages] = useState([]);
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
    const [votingSchedule, setVotingSchedule] = useState({ deadline: "", isClosed: false, votingClosed: false });
    const [deadlineInput, setDeadlineInput] = useState("");
    const [isSavingSchedule, setIsSavingSchedule] = useState(false);
    const [timerCountdown, setTimerCountdown] = useState(null);
    const [activePanel, setActivePanel] = useState("overview");

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

    const loadVotingSchedule = async () => {
        try {
            const data = await fetchVotingTime();
            setVotingSchedule(data);
            if (data.deadline) {
                const date = new Date(data.deadline);
                const pad = (n) => String(n).padStart(2, "0");
                const localIso = `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
                setDeadlineInput(localIso);
            } else {
                setDeadlineInput("");
            }
        } catch (e) {
            console.error(e);
        }
    };

    useEffect(() => {
        loadCandidates();
        loadTitles();
        loadTeacherTokens();
        loadVoteSummary();
        loadPublishedResults();
        loadVotingSchedule();
    }, []);

    useEffect(() => {
        const interval = setInterval(() => {
            if (votingSchedule?.deadline) {
                const remaining = formatRemainingTime(votingSchedule.deadline);
                setTimerCountdown(remaining);
            } else {
                setTimerCountdown(null);
            }
        }, 1000);
        return () => clearInterval(interval);
    }, [votingSchedule]);

    const handleSaveDeadline = async (customIso = null) => {
        try {
            setIsSavingSchedule(true);
            setError("");
            const targetIso = customIso !== null ? customIso : (deadlineInput ? new Date(deadlineInput).toISOString() : "");
            const res = await saveVotingTime({ deadline: targetIso, closed: false });
            setVotingSchedule(res);
            setSuccessMessage("Voting schedule saved successfully.");
        } catch (err) {
            setError(err.message || "Could not save voting schedule.");
        } finally {
            setIsSavingSchedule(false);
        }
    };

    const handleCloseVotingNow = async () => {
        const confirmed = window.confirm("Are you sure you want to immediately close student voting? Students will no longer be able to submit votes.");
        if (!confirmed) return;
        try {
            setIsSavingSchedule(true);
            setError("");
            const res = await saveVotingTime({ deadline: new Date().toISOString(), closed: true });
            setVotingSchedule(res);
            setSuccessMessage("Voting has been closed immediately.");
        } catch (err) {
            setError(err.message || "Could not close voting.");
        } finally {
            setIsSavingSchedule(false);
        }
    };

    const handleClearDeadline = async () => {
        try {
            setIsSavingSchedule(true);
            setError("");
            const res = await saveVotingTime({ deadline: "", closed: false });
            setVotingSchedule(res);
            setDeadlineInput("");
            setSuccessMessage("Voting deadline removed. Voting is now open without timer.");
        } catch (err) {
            setError(err.message || "Could not clear deadline.");
        } finally {
            setIsSavingSchedule(false);
        }
    };

    const handlePresetTime = (minutes) => {
        const target = new Date(Date.now() + minutes * 60 * 1000);
        const pad = (n) => String(n).padStart(2, "0");
        const localIso = `${target.getFullYear()}-${pad(target.getMonth() + 1)}-${pad(target.getDate())}T${pad(target.getHours())}:${pad(target.getMinutes())}`;
        setDeadlineInput(localIso);
        handleSaveDeadline(target.toISOString());
    };

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
        setCandidateFormError("");
        setCandidateFormSuccess("");
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
                body: JSON.stringify({
                    studentWeight: voteRatio.student,
                    teacherWeight: voteRatio.teacher,
                    candidateId: row.candidateId,
                }),
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
            setTeacherTokenExpiresAt(data.expiresAt || "3 hours");
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
            return;
        }

        const isImage = file.type.startsWith("image/") || /\.(png|jpe?g|gif|bmp|webp|svg)$/i.test(file.name);

        if (!isImage) {
            setCandidateFormError("Please choose a valid image file.");
            event.target.value = "";
            return;
        }

        setSelectedFileName(file.name);

        const reader = new FileReader();
        reader.onload = () => {
            setCandidateFormError("");
            setFormData((previous) => ({ ...previous, photo: reader.result }));
        };
        reader.onerror = () => {
            setCandidateFormError("Failed to read the selected photo file.");
        };
        reader.readAsDataURL(file);
    };

    const handleRemoveMainPhoto = () => {
        setSelectedFileName("");
        setFormData((previous) => ({ ...previous, photo: "" }));
        if (photoInputRef.current) {
            photoInputRef.current.value = "";
        }
    };

    const handleGalleryChange = (event) => {
        const files = Array.from(event.target.files || []);
        if (files.length === 0) return;

        const invalidFile = files.find((file) => !file.type.startsWith("image/") && !/\.(png|jpe?g|gif|bmp|webp|svg)$/i.test(file.name));
        if (invalidFile) {
            setCandidateFormError("Gallery images must be valid image files.");
            event.target.value = "";
            return;
        }

        Promise.all(files.map((file) => new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result);
            reader.onerror = reject;
            reader.readAsDataURL(file);
        }))).then((newImages) => {
            setCandidateFormError("");
            setGalleryImages((prev) => [...prev, ...newImages]);
        }).catch(() => setCandidateFormError("Failed to read gallery images."));
    };

    const handleRemoveGalleryImage = (indexToRemove) => {
        setGalleryImages((previous) => {
            const next = previous.filter((_, idx) => idx !== indexToRemove);
            if (next.length === 0 && galleryInputRef.current) {
                galleryInputRef.current.value = "";
            }
            return next;
        });
    };

    const handleClearAllGallery = () => {
        setGalleryImages([]);
        if (galleryInputRef.current) {
            galleryInputRef.current.value = "";
        }
    };

    const resetForm = () => {
        setGalleryImages([]);
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
        setIsCandidateModalOpen(false);
        setCandidateFormError("");
        setCandidateFormSuccess("");
        if (photoInputRef.current) {
            photoInputRef.current.value = "";
        }
        if (galleryInputRef.current) {
            galleryInputRef.current.value = "";
        }
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
            setCandidateFormError("Candidate name is required.");
            return;
        }

        if (candidateNo < 1) {
            setCandidateFormError("Please enter a candidate number.");
            return;
        }

        const duplicateNumber = candidates.some((candidate) =>
            candidate.id !== editingId
            && Number(candidate.no) === candidateNo
            && String(candidate.gender).toLowerCase() === formData.gender.toLowerCase()
        );
        if (duplicateNumber) {
            setCandidateFormError(`Candidate number ${candidateNo} already exists for ${formData.gender} candidates.`);
            return;
        }

        const categoriesForGender = titles
            .filter((title) => title.gender === formData.gender)
            .map((title) => title.name);

        if (categoriesForGender.length === 0) {
            setCandidateFormError(`Please add at least one ${formData.gender.toLowerCase()} title first.`);
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
                let serverMessage = responseText;
                try {
                    const errorBody = JSON.parse(responseText);
                    serverMessage = errorBody.message || errorBody.error || responseText;
                } catch {
                    // The backend may return a plain-text validation message.
                }
                const message = serverMessage || `Unable to ${action} candidate (HTTP ${response.status}).`;
                throw new Error(message);
            }

            if (galleryImages.length > 0) {
                const savedPayload = responseText ? JSON.parse(responseText) : null;
                const savedCandidateId = editingId !== null
                    ? editingId
                    : (Array.isArray(savedPayload) ? savedPayload[0]?.id : savedPayload?.id);
                if (savedCandidateId) {
                    const galleryResponses = await Promise.all(galleryImages.map((image) => fetch(`${API_URL}/${savedCandidateId}/images`, {
                        method: "POST", credentials: "include", headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ image }),
                    })));
                    const failedGalleryResponse = galleryResponses.find((galleryResponse) => !galleryResponse.ok);
                    if (failedGalleryResponse) {
                        const galleryError = await failedGalleryResponse.text();
                        throw new Error(galleryError || `Unable to add gallery image (HTTP ${failedGalleryResponse.status}).`);
                    }
                }
            }

            const successText = editingId !== null ? "Candidate updated successfully." : "Candidate uploaded successfully.";
            setCandidateFormError("");
            setCandidateFormSuccess(successText);
            setError("");
            await loadCandidates();
            if (editingId === null) {
                resetForm();
            }
        } catch (submitError) {
            console.error("Candidate save failed:", submitError);
            setCandidateFormSuccess("");
            setCandidateFormError(submitError.message || "Something went wrong while saving the candidate.");
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
        setSelectedFileName("");
        setGalleryImages([]);
        setIsCandidateModalOpen(true);
        setCandidateFormError("");
        setCandidateFormSuccess("");
        setError("");
    };

    const handleOpenAddCandidate = () => {
        resetForm();
        setIsCandidateModalOpen(true);
        setCandidateFormError("");
        setCandidateFormSuccess("");
        setError("");
    };

    const handleDelete = async (candidateId) => {
        const candidate = candidates.find((item) => item.id === candidateId);
        const candidateName = candidate?.name || "this candidate";

        const confirmed = window.confirm(`Are you sure you want to delete ${candidateName}? This action cannot be undone.`);
        if (!confirmed) {
            return;
        }

        try {
            const response = await fetch(`${API_URL}/${candidateId}`, {
                method: "DELETE",
                credentials: "include",
            });

            if (!response.ok) {
                const responseText = await response.text();
                throw new Error(responseText || `Unable to delete candidate (HTTP ${response.status}).`);
            }

            if (editingId === candidateId) {
                resetForm();
            }

            await loadCandidates();
            await loadVoteSummary();
            await loadPublishedResults();
            setError("");
            setSuccessMessage(`Candidate number ${candidate?.no ?? ""} was deleted and is available again.`);
        } catch (deleteError) {
            setSuccessMessage("");
            setError(deleteError.message || "Could not delete candidate.");
        }
    };

    const studentVotes = Number(backendVoteTotals.student || 0);
    const teacherVotes = Number(backendVoteTotals.teacher || 0);
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

    const getTitleVoteCount = (candidate, titleName, voteMapName) => {
        const entry = Object.entries(candidate?.[voteMapName] || {}).find(
            ([key]) => String(key).toLowerCase() === String(titleName).toLowerCase()
        );
        return Number(entry?.[1] || 0);
    };

    const getTitleTeacherVotes = (candidate, titleName) =>
        getTitleVoteCount(candidate, titleName, "titleTeacherVoteCounts");

    const getTitleLeaders = (titleName, excludedCandidateIds = new Set()) => {
        const titleCandidates = (candidates || []).filter((candidate) => {
            if (!candidate || !candidate.titles) {
                return false;
            }
            return !excludedCandidateIds.has(String(candidate.id))
                && candidate.titles.some((title) => title && title.toLowerCase() === String(titleName).toLowerCase());
        });

        if (titleCandidates.length === 0) {
            return [];
        }

        const highestScore = Math.max(...titleCandidates.map((candidate) =>
            getTitleWeightedScore(candidate, titleName)));
        let leaders = titleCandidates.filter((candidate) =>
            Math.abs(getTitleWeightedScore(candidate, titleName) - highestScore) < 0.000001
        );
        if (voteRatio.student === 50 && voteRatio.teacher === 50 && leaders.length > 1) {
            const highestTeacherVotes = Math.max(...leaders.map((candidate) =>
                getTitleTeacherVotes(candidate, titleName)));
            leaders = leaders.filter((candidate) =>
                getTitleTeacherVotes(candidate, titleName) === highestTeacherVotes
            );
        }
        return leaders;
    };

    const assignedLeaderIds = new Set();
    const titleLeaderRows = (titles || []).flatMap((title) => {
        const leaders = getTitleLeaders(title.name, assignedLeaderIds);
        leaders.forEach((leader) => assignedLeaderIds.add(String(leader.id)));
        const rows = leaders.length > 0 ? leaders : [null];
        return rows.map((leader, index) => ({
            title: title.name,
            candidateNo: leader?.no ?? "—",
            leaderName: leader?.name || "No eligible leader yet",
            studentVotes: leader ? getTitleVoteCount(leader, title.name, "titleStudentVoteCounts") : 0,
            teacherVotes: leader ? getTitleVoteCount(leader, title.name, "titleTeacherVoteCounts") : 0,
            totalPercentage: leader ? getTitleWeightedScore(leader, title.name) : 0,
            candidateId: leader?.id || null,
            isAddedToResult: resultLeaders.some((item) => item.title.toLowerCase() === title.name.toLowerCase()),
            isPrimaryLeader: index === 0,
        }));
    });

    const allTitleResultRows = (titles || []).flatMap((title) => {
        const titleCandidates = (candidates || [])
            .filter((candidate) => candidate?.titles?.some((item) =>
                String(item).toLowerCase() === String(title.name).toLowerCase()))
            .sort((left, right) => {
                const scoreDifference = getTitleWeightedScore(right, title.name)
                    - getTitleWeightedScore(left, title.name);
                if (Math.abs(scoreDifference) > 0.000001) return scoreDifference;
                return getTitleTeacherVotes(right, title.name) - getTitleTeacherVotes(left, title.name);
            });
        return titleCandidates.map((candidate, index) => ({
            title: title.name,
            gender: title.gender || candidate.gender || "",
            rank: index + 1,
            candidateNo: candidate.no ?? "—",
            candidateName: candidate.name,
            studentVotes: getTitleVoteCount(candidate, title.name, "titleStudentVoteCounts"),
            teacherVotes: getTitleVoteCount(candidate, title.name, "titleTeacherVoteCounts"),
            totalPercentage: getTitleWeightedScore(candidate, title.name),
        }));
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
                loadVotingSchedule(),
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

            <div className="dashboard-overview-grid">
                <div className="overview-card"><span>Total votes</span><strong>{studentVotes + teacherVotes}</strong><small>Across all voters</small></div>
                <div className="overview-card"><span>Candidates</span><strong>{candidates.length}</strong><small>Male and female</small></div>
                <div className="overview-card"><span>Election titles</span><strong>{titles.length}</strong><small>Configured categories</small></div>
                <div className="overview-card"><span>Published winners</span><strong>{resultLeaders.length}</strong><small>Visible on results</small></div>
            </div>

            <div className="dashboard-workspace">
                <aside className="dashboard-sidebar" aria-label="Dashboard sections">
                    <div className="dashboard-sidebar-brand">
                        <span className="dashboard-brand-mark"><i className="fa-solid fa-landmark" aria-hidden="true" /></span>
                        <div><strong>Election admin</strong><small>Control center</small></div>
                    </div>
                    <p className="dashboard-nav-label">Workspace</p>
                    <nav className="dashboard-nav">
                        {[
                            ["overview", "Overview", "fa-chart-line"],
                            ["candidates", "Candidates", "fa-users"],
                            ["titles", "Election titles", "fa-list-check"],
                            ["schedule", "Voting schedule", "fa-calendar-days"],
                            ["weights", "Vote weighting", "fa-scale-balanced"],
                            ["teachers", "Teacher access", "fa-qrcode"],
                        ].map(([panel, label, icon]) => (
                            <button
                                type="button"
                                key={panel}
                                className={`dashboard-nav-item ${activePanel === panel ? "is-active" : ""}`}
                                onClick={() => setActivePanel(panel)}
                                aria-current={activePanel === panel ? "page" : undefined}
                            >
                                <i className={`fa-solid ${icon}`} aria-hidden="true" />
                                <span>{label}</span>
                                {panel === "candidates" && <small>{candidates.length}</small>}
                                {panel === "titles" && <small>{titles.length}</small>}
                            </button>
                        ))}
                    </nav>
                    <div className="dashboard-sidebar-footer">
                        <span className="live-dot" aria-hidden="true" />
                        <div><small>System status</small><strong>All systems live</strong></div>
                    </div>
                </aside>

                <main className="dashboard-content">
                    <div className="dashboard-content-heading">
                        <div>
                            <p className="dashboard-kicker">{activePanel === "overview" ? "At a glance" : "Workspace"}</p>
                            <h2>{activePanel === "overview" ? "Election overview" : activePanel === "candidates" ? "Candidate management" : activePanel === "titles" ? "Election titles" : activePanel === "schedule" ? "Voting schedule" : activePanel === "weights" ? "Vote weighting" : "Teacher voting access"}</h2>
                        </div>
                        <span className="dashboard-content-meta">Updated just now</span>
                    </div>

                    {activePanel === "overview" && <>
                    <section className="leaderboard-panel">
                <div className="panel-heading-row">
                    <div>
                        <p className="dashboard-kicker">Title Leaderboard</p>
                        <h2>Top candidate for each title</h2>
                    </div>
                    <span className="panel-count">{titles.length} titles</span>
                </div>

                <div className="leaderboard-table-wrap">
                    <table className="leaderboard-table">
                        <thead>
                            <tr>
                                <th>Title</th>
                                <th>No.</th>
                                <th>Current leader</th>
                                <th>Student votes</th>
                                <th>Teacher votes</th>
                                <th>Total vote %</th>
                                <th>Result control</th>
                            </tr>
                        </thead>
                        <tbody>
                            {titleLeaderRows.length === 0 && (
                                <tr>
                                    <td colSpan="7" className="leaderboard-empty">Add an election title to start tracking leaders.</td>
                                </tr>
                            )}
                            {titleLeaderRows.map((row) => (
                                <tr key={`${row.title}-${row.candidateId ?? "none"}`}>
                                    <td><span className="title-table-name">{row.title}</span></td>
                                    <td><strong className="candidate-number-cell">{row.candidateNo}</strong></td>
                                    <td>{row.leaderName}</td>
                                    <td><strong className="student-vote-count">{row.studentVotes}</strong></td>
                                    <td><strong className="teacher-vote-count">{row.teacherVotes}</strong></td>
                                    <td><strong className="total-vote-percentage">{row.totalPercentage.toFixed(1)}%</strong></td>
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

                    <section className="leaderboard-panel all-results-panel">
                <div className="panel-heading-row">
                    <div>
                        <p className="dashboard-kicker">Complete Results</p>
                        <h2>All candidates by title</h2>
                    </div>
                    <span className="panel-count">{allTitleResultRows.length} entries</span>
                </div>
                <div className="leaderboard-table-wrap">
                    <table className="leaderboard-table">
                        <thead>
                            <tr>
                                <th>Title</th><th>Gender</th><th>Rank</th><th>No.</th><th>Candidate</th>
                                <th>Student votes</th><th>Teacher votes</th><th>Total vote %</th>
                            </tr>
                        </thead>
                        <tbody>
                            {allTitleResultRows.length === 0 ? (
                                <tr><td colSpan="8" className="leaderboard-empty">No candidate results available yet.</td></tr>
                            ) : allTitleResultRows.map((row) => (
                                <tr key={`${row.title}-${row.candidateName}-${row.candidateNo}`} className={row.rank === 1 ? "result-title-start" : ""}>
                                    <td><span className="title-table-name result-title-badge">{row.title}</span></td>
                                    <td>{row.gender}</td><td>{row.rank}</td>
                                    <td><strong className="candidate-number-cell">{row.candidateNo}</strong></td>
                                    <td>{row.candidateName}</td>
                                    <td><strong className="student-vote-count">{row.studentVotes}</strong></td>
                                    <td><strong className="teacher-vote-count">{row.teacherVotes}</strong></td>
                                    <td><strong className="total-vote-percentage">{row.totalPercentage.toFixed(1)}%</strong></td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
                    </section>
                    </>}

                {activePanel === "weights" && <div className="vote-split-editor">
                <div className="split-editor-copy">
                    <p className="dashboard-kicker">Live weighting</p>
                    <h2>Voting influence</h2>
                    <p>Adjust how much student and teacher votes contribute to each title result.</p>
                    {voteRatio.student === 50 && voteRatio.teacher === 50 && (
                        <p className="tie-break-note"><i className="fa-solid fa-scale-balanced" aria-hidden="true" /> Equal scores favor the candidate with more teacher votes.</p>
                    )}
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
            </div>}

            {activePanel === "schedule" && <div className="voting-schedule-panel">
                <div className="voting-schedule-header">
                    <div>
                        <p className="dashboard-kicker">Election Schedule</p>
                        <h2>Voting Deadline & Timer</h2>
                        <p className="dashboard-subtitle" style={{ margin: "4px 0 0" }}>
                            Set an automatic timer after which student votes will be disabled across all categories.
                        </p>
                    </div>
                    <div className={`voting-status-badge ${votingSchedule?.isClosed ? "is-closed" : (votingSchedule?.deadline ? "is-scheduled" : "is-open")}`}>
                        <span className="status-indicator-dot" />
                        {votingSchedule?.isClosed
                            ? "Voting Closed"
                            : (votingSchedule?.deadline
                                ? `Active · Closes in ${timerCountdown?.text || "calculating..."}`
                                : "Open (No Deadline Set)")}
                    </div>
                </div>

                <div className="voting-schedule-body">
                    <div className="voting-schedule-controls">
                        <div className="voting-schedule-input-group">
                            <label htmlFor="voting-deadline-picker">
                                Set Closing Date & Time
                            </label>
                            <input
                                id="voting-deadline-picker"
                                type="datetime-local"
                                value={deadlineInput}
                                onChange={(e) => setDeadlineInput(e.target.value)}
                                className="voting-deadline-input"
                            />
                        </div>

                        <div className="schedule-preset-buttons">
                            <span className="schedule-preset-label">Quick presets:</span>
                            <button type="button" className="preset-btn" onClick={() => handlePresetTime(15)}>+15 min</button>
                            <button type="button" className="preset-btn" onClick={() => handlePresetTime(30)}>+30 min</button>
                            <button type="button" className="preset-btn" onClick={() => handlePresetTime(60)}>+1 hour</button>
                            <button type="button" className="preset-btn" onClick={() => handlePresetTime(120)}>+2 hours</button>
                            <button type="button" className="preset-btn" onClick={() => handlePresetTime(360)}>+6 hours</button>
                            <button type="button" className="preset-btn" onClick={() => handlePresetTime(1440)}>+24 hours</button>
                        </div>
                    </div>

                    <div className="voting-schedule-actions">
                        <button
                            type="button"
                            className="primary-button"
                            onClick={() => handleSaveDeadline()}
                            disabled={isSavingSchedule || !deadlineInput}
                        >
                            <i className="fa-solid fa-clock" aria-hidden="true" />
                            {isSavingSchedule ? "Saving..." : "Save Deadline"}
                        </button>

                        <button
                            type="button"
                            className="delete-button"
                            onClick={handleCloseVotingNow}
                            disabled={isSavingSchedule || votingSchedule?.isClosed}
                            title="Immediately disable voting for all students"
                        >
                            <i className="fa-solid fa-lock" aria-hidden="true" />
                            Close Voting Now
                        </button>

                        {(votingSchedule?.deadline || votingSchedule?.isClosed) && (
                            <button
                                type="button"
                                className="secondary-button"
                                onClick={handleClearDeadline}
                                disabled={isSavingSchedule}
                                title="Remove deadline and reopen voting"
                            >
                                <i className="fa-solid fa-unlock" aria-hidden="true" />
                                Reopen / Clear Timer
                            </button>
                        )}
                    </div>
                </div>
            </div>}

            {activePanel === "teachers" && <div className="teacher-token-panel">
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
            </div>}

            {activePanel === "candidates" && <div className="dashboard-layout">
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

                    <div className="dashboard-add-candidate-trigger">
                        <button type="button" className="primary-button add-candidate-trigger-btn" onClick={handleOpenAddCandidate}>
                            <i className="fa-solid fa-user-plus" aria-hidden="true" /> Add New Candidate
                        </button>
                    </div>
                </div>

                {isCandidateModalOpen && (
                    <div className="candidate-modal-backdrop" role="presentation" onMouseDown={() => resetForm()}>
                        <div
                            className="candidate-modal-dialog"
                            role="dialog"
                            aria-modal="true"
                            aria-labelledby="candidate-modal-title"
                            onMouseDown={(e) => e.stopPropagation()}
                        >
                            <div className="candidate-modal-header">
                                <h2 id="candidate-modal-title">{editingId !== null ? "Edit Candidate" : "Add Candidate"}</h2>
                                <button type="button" className="candidate-modal-close" onClick={resetForm} aria-label="Close modal">
                                    ×
                                </button>
                            </div>

                            <form className="candidate-form-modal" onSubmit={handleSubmit}>
                                {titles.length === 0 && editingId === null && (
                                    <div className="candidate-title-reminder" role="alert">
                                        <div>
                                            <strong>Add a title first</strong>
                                            <span>Candidates must belong to at least one election title before they can be added.</span>
                                        </div>
                                        <button
                                            type="button"
                                            onClick={() => {
                                                setIsTitleDialogOpen(true);
                                                setIsCandidateModalOpen(false);
                                                setError("");
                                            }}
                                        >
                                            Add title
                                        </button>
                                    </div>
                                )}

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
                                    <input
                                        ref={photoInputRef}
                                        type="file"
                                        accept="image/*"
                                        onChange={handlePhotoChange}
                                        className="photo-input"
                                    />
                                </label>

                                <label className="photo-upload">
                                    <span className="photo-upload-title">Gallery photos (optional)</span>
                                    <span className="photo-upload-box">
                                        <span className="upload-icon">▧</span>
                                        <span>{galleryImages.length ? `${galleryImages.length} gallery photo(s) selected` : "Add more candidate photos"}</span>
                                    </span>
                                    <input
                                        ref={galleryInputRef}
                                        type="file"
                                        accept="image/*"
                                        multiple
                                        onChange={handleGalleryChange}
                                        className="photo-input"
                                    />
                                </label>

                                {formData.photo && (
                                    <div className="photo-preview-wrap">
                                        <div className="photo-preview-header">
                                            <span className="photo-preview-label">Main Photo Preview</span>
                                            <button
                                                type="button"
                                                className="photo-cancel-button"
                                                onClick={handleRemoveMainPhoto}
                                                title="Remove main photo"
                                            >
                                                <i className="fa-solid fa-trash-can" aria-hidden="true" /> Remove photo
                                            </button>
                                        </div>
                                        <img src={resolveImageUrl(formData.photo)} alt="Selected candidate preview" className="candidate-photo preview-photo" />
                                    </div>
                                )}

                                {galleryImages.length > 0 && (
                                    <div className="gallery-staging-wrap">
                                        <div className="photo-preview-header">
                                            <span className="photo-preview-label">Selected Gallery Photos ({galleryImages.length})</span>
                                            <button
                                                type="button"
                                                className="photo-cancel-button"
                                                onClick={handleClearAllGallery}
                                                title="Remove all gallery photos"
                                            >
                                                <i className="fa-solid fa-trash-can" aria-hidden="true" /> Clear all
                                            </button>
                                        </div>
                                        <div className="gallery-staging-grid">
                                            {galleryImages.map((imageSrc, index) => (
                                                <div key={index} className="gallery-staging-item">
                                                    <img src={imageSrc} alt={`Gallery selection ${index + 1}`} className="gallery-staging-thumb" />
                                                    <button
                                                        type="button"
                                                        className="gallery-staging-remove"
                                                        onClick={() => handleRemoveGalleryImage(index)}
                                                        title="Remove this photo"
                                                        aria-label={`Remove photo ${index + 1}`}
                                                    >
                                                        ×
                                                    </button>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                <div className="form-actions">
                                    <button type="submit" className="primary-button" disabled={titles.length === 0 && editingId === null}>
                                        {editingId !== null ? "Save Changes" : "Add Candidate"}
                                    </button>

                                    <button type="button" className="secondary-button" onClick={resetForm}>
                                        Cancel
                                    </button>
                                </div>

                                {candidateFormError && (
                                    <div className="candidate-form-error" role="alert">
                                        <i className="fa-solid fa-triangle-exclamation" aria-hidden="true" />
                                        <span>{candidateFormError}</span>
                                        <button type="button" onClick={() => setCandidateFormError("")} aria-label="Dismiss candidate form error">×</button>
                                    </div>
                                )}

                                {candidateFormSuccess && (
                                    <div className="candidate-form-success" role="status">
                                        <i className="fa-solid fa-circle-check" aria-hidden="true" />
                                        <span>{candidateFormSuccess}</span>
                                        <button type="button" onClick={() => setCandidateFormSuccess("")} aria-label="Dismiss candidate form success">×</button>
                                    </div>
                                )}
                            </form>
                        </div>
                    </div>
                )}

                <div className="sections-panel">
                    {loading ? (
                        <div className="candidate-card loading-card">Loading candidates...</div>
                    ) : (
                        dashboardSections.map((section) => {
                            const sectionName = section.name;
                            const sectionCandidates = section.candidates || [];
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
                                            {sectionCandidates.map((candidate, idx) => (
                                                <article className="candidate-card dashboard-candidate-card" key={candidate.id}>
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

                                                    {candidate.bio && (
                                                        <p className="candidate-bio-text">{candidate.bio}</p>
                                                    )}

                                                    <div className="candidate-actions">
                                                        <button type="button" className="edit-button" onClick={() => handleEdit(candidate)}>
                                                            <i className="fa-solid fa-pen-to-square" aria-hidden="true" /> Edit
                                                        </button>
                                                        <button type="button" className="delete-button" onClick={() => handleDelete(candidate.id)}>
                                                            <i className="fa-solid fa-trash-can" aria-hidden="true" /> Delete
                                                        </button>
                                                    </div>
                                                </article>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            );
                        })
                    )}
                </div>
            </div>}

            {activePanel === "titles" && <div className="title-category-box dashboard-workspace-card dashboard-titles-view">
                <div className="title-category-header">
                    <div><span>Title categories</span><small>{titles.length} configured</small></div>
                    <button type="button" className="add-title-button" onClick={() => { setIsTitleDialogOpen(true); setError(""); }}>+ Add Title</button>
                </div>
                {titles.length === 0 ? <p className="empty-title-message">No titles added yet.</p> : <div className="title-category-grid">
                    {titles.map((title) => <div key={title.id} className="title-option selected"><div className="title-option-text"><span>{title.name}</span><small>{title.gender}</small></div><button type="button" className="remove-title-button" onClick={() => handleDeleteTitle(title)} aria-label={`Remove ${title.name}`}>×</button></div>)}
                </div>}
                {isTitleDialogOpen && <div className="add-title-form">
                    <label>Title<input type="text" value={newTitle.name} onChange={(event) => setNewTitle((previous) => ({ ...previous, name: event.target.value }))} placeholder="e.g. King" autoFocus /></label>
                    <fieldset><legend>Title gender</legend><label className="gender-choice"><input type="radio" name="titles-view-gender" value="Male" checked={newTitle.gender === "Male"} onChange={(event) => setNewTitle((previous) => ({ ...previous, gender: event.target.value }))} />Male</label><label className="gender-choice"><input type="radio" name="titles-view-gender" value="Female" checked={newTitle.gender === "Female"} onChange={(event) => setNewTitle((previous) => ({ ...previous, gender: event.target.value }))} />Female</label></fieldset>
                    <div className="title-form-actions"><button type="button" className="primary-button" onClick={handleAddTitle}>Add</button><button type="button" className="secondary-button" onClick={() => setIsTitleDialogOpen(false)}>Cancel</button></div>
                </div>}
            </div>}
                </main>
            </div>

            {(error || successMessage) && (
                <div className="dashboard-bottom-notifications" aria-live="polite">
                    {error && (
                        <div className="dashboard-notice error" role="alert">
                            <i className="fa-solid fa-triangle-exclamation" aria-hidden="true" />
                            <span>{error}</span>
                            <button type="button" onClick={() => setError("")} aria-label="Dismiss error">×</button>
                        </div>
                    )}
                    {successMessage && (
                        <div className="dashboard-notice success" role="status">
                            <i className="fa-solid fa-circle-check" aria-hidden="true" />
                            <span>{successMessage}</span>
                            <button type="button" onClick={() => setSuccessMessage("")} aria-label="Dismiss success message">×</button>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}

export default Dashboard;
