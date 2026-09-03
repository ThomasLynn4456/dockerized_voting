const STORAGE_KEY = "gp3-vote-counts";
const RATIO_KEY = "gp3-vote-ratio";

const normalizeVoteData = (rawData = {}) => {
    const normalized = {
        student: rawData.student || rawData.boy || {},
        teacher: rawData.teacher || rawData.girl || {},
    };

    return normalized;
};

const readStorage = () => {
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        return raw ? normalizeVoteData(JSON.parse(raw)) : { student: {}, teacher: {} };
    } catch {
        return { student: {}, teacher: {} };
    }
};

const writeStorage = (data) => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
};

export const getVoteCountsByPage = (pageKey) => {
    const data = readStorage();
    const normalizedKey = pageKey === "boy" ? "student" : pageKey === "girl" ? "teacher" : pageKey;
    return data[normalizedKey] || {};
};

export const getAllVoteTotals = () => {
    const data = readStorage();
    const totals = {
        student: 0,
        teacher: 0,
    };

    Object.values(data.student || {}).forEach((count) => {
        totals.student += Number(count || 0);
    });

    Object.values(data.teacher || {}).forEach((count) => {
        totals.teacher += Number(count || 0);
    });

    return totals;
};

export const recordVote = (pageKey, candidateId) => {
    const data = readStorage();
    const normalizedKey = pageKey === "boy" ? "student" : pageKey === "girl" ? "teacher" : pageKey;
    const pageVotes = data[normalizedKey] || {};
    const candidateKey = String(candidateId);

    pageVotes[candidateKey] = (Number(pageVotes[candidateKey]) || 0) + 1;

    data[normalizedKey] = pageVotes;
    writeStorage(data);
};

export const getVoteRatio = () => {
    try {
        const raw = localStorage.getItem(RATIO_KEY);
        if (!raw) {
            return { student: 60, teacher: 40 };
        }

        const parsed = JSON.parse(raw);
        const student = Number(parsed.student ?? 60);
        const teacher = Number(parsed.teacher ?? 40);

        const safeStudent = Math.min(100, Math.max(0, Number.isFinite(student) ? student : 60));
        const safeTeacher = Math.min(100, Math.max(0, Number.isFinite(teacher) ? teacher : 40));
        const total = safeStudent + safeTeacher;

        if (total === 0) {
            return { student: 50, teacher: 50 };
        }

        if (total !== 100) {
            const normalizedStudent = Math.min(100, Math.max(0, safeStudent));
            return {
                student: normalizedStudent,
                teacher: 100 - normalizedStudent,
            };
        }

        return {
            student: safeStudent,
            teacher: safeTeacher,
        };
    } catch {
        return { student: 60, teacher: 40 };
    }
};

export const setVoteRatio = ({ student, teacher }) => {
    const nextStudent = Number(student ?? 0);
    const nextTeacher = Number(teacher ?? 0);
    const safeStudent = Math.min(100, Math.max(0, Number.isFinite(nextStudent) ? nextStudent : 0));
    const safeTeacher = Math.min(100, Math.max(0, Number.isFinite(nextTeacher) ? nextTeacher : 0));

    const ratio = {
        student: safeStudent,
        teacher: safeTeacher,
    };

    const total = ratio.student + ratio.teacher;
    if (total === 0) {
        ratio.student = 50;
        ratio.teacher = 50;
    } else if (total !== 100) {
        const normalizedStudent = Math.min(100, Math.max(0, ratio.student));
        ratio.student = normalizedStudent;
        ratio.teacher = 100 - normalizedStudent;
    }

    localStorage.setItem(RATIO_KEY, JSON.stringify(ratio));
    return ratio;
};

export const resetVoteData = () => {
    const cleared = { student: {}, teacher: {} };
    writeStorage(cleared);
    return cleared;
};
