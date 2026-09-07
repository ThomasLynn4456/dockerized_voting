import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { fetchCurrentStudent, saveStudentSession } from "../utils/studentSession";
import { fetchVotingTime, formatRemainingTime } from "../utils/votingTime";
import "./Welcome.css";

import logo from "./img/logo.png";
import backgroundImage from "./img/images.jpg";

const WELCOME_DRAFT_KEY = "voting_welcome_draft";
const TELEGRAM_LINK_PENDING_KEY = "voting_telegram_link_pending";
const EMPTY_FORM = { username: "", major: "", phoneNumber: "", telegramChatId: "" };

function loadWelcomeDraft() {
  try {
    const saved = JSON.parse(window.sessionStorage.getItem(WELCOME_DRAFT_KEY));
    return saved && typeof saved === "object" ? { ...EMPTY_FORM, ...saved } : EMPTY_FORM;
  } catch {
    return EMPTY_FORM;
  }
}

function loadTelegramLinkPending() {
  try {
    return window.sessionStorage.getItem(TELEGRAM_LINK_PENDING_KEY) === "true";
  } catch {
    return false;
  }
}

const particles = Array.from({ length: 70 }, (_, index) => ({
  id: index,
  left: `${(index * 37) % 100}%`,
  duration: `${4 + ((index * 17) % 7)}s`,
  delay: `${((index * 13) % 50) / 10}s`,
  opacity: 0.25 + ((index * 29) % 70) / 100,
  size: `${3 + ((index * 11) % 4)}px`,
}));

async function readJsonResponse(response) {
  const body = await response.text();
  if (!body) return null;

  try {
    return JSON.parse(body);
  } catch {
    // Spring and reverse proxies can return useful plain-text error bodies.
    return body;
  }
}

function responseMessage(data, fallback) {
  if (typeof data === "string" && data.trim()) return data;
  if (data && typeof data.message === "string" && data.message.trim()) return data.message;
  return fallback;
}

function Welcome() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState(loadWelcomeDraft);
  const [otp, setOtp] = useState("");
  const [otpRequested, setOtpRequested] = useState(false);
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [telegramLink, setTelegramLink] = useState(() => loadTelegramLinkPending() ? "launched" : "");
  const [telegramConnected, setTelegramConnected] = useState(() => Boolean(loadWelcomeDraft().telegramChatId));
  const [votingSchedule, setVotingSchedule] = useState({ deadline: "", isClosed: false, votingClosed: false });
  const [scheduleError, setScheduleError] = useState("");
  const [countdown, setCountdown] = useState(null);

  useEffect(() => {
    fetchVotingTime()
      .then((schedule) => {
        setVotingSchedule(schedule);
        setScheduleError("");
        setCountdown(schedule.deadline ? formatRemainingTime(schedule.deadline) : null);
      })
      .catch((error) => setScheduleError(error.message || "Unable to load voting schedule."));
  }, []);

  useEffect(() => {
    if (!votingSchedule.deadline) return undefined;
    const timer = window.setInterval(() => {
      setCountdown(formatRemainingTime(votingSchedule.deadline));
    }, 1000);
    return () => window.clearInterval(timer);
  }, [votingSchedule.deadline]);

  const isVotingClosed = Boolean(votingSchedule.votingClosed || votingSchedule.isClosed || countdown?.expired);

  useEffect(() => {
    try {
      window.sessionStorage.setItem(WELCOME_DRAFT_KEY, JSON.stringify(formData));
    } catch {
      // Safari can disable storage in some private browsing configurations.
    }
  }, [formData]);

  useEffect(() => {
    try {
      if (telegramLink && !telegramConnected) {
        window.sessionStorage.setItem(TELEGRAM_LINK_PENDING_KEY, "true");
      } else {
        window.sessionStorage.removeItem(TELEGRAM_LINK_PENDING_KEY);
      }
    } catch {
      // Keep the in-memory flow working when storage is unavailable.
    }
  }, [telegramLink, telegramConnected]);

  useEffect(() => {
    async function checkExistingSession() {
      const student = await fetchCurrentStudent();
      if (student && student.verified) {
        navigate("/home");
      }
    }
    checkExistingSession();
  }, [navigate]);

  useEffect(() => {
    if (!telegramLink || telegramConnected) return undefined;

    let consecutiveErrors = 0;
    const timer = window.setInterval(async () => {
      try {
        const statusResponse = await fetch("/api/telegram/link/status", { credentials: "include" });
        const status = await readJsonResponse(statusResponse);
        if (statusResponse.ok && status?.linked) {
          setTelegramConnected(true);
          setFormData((current) => ({ ...current, telegramChatId: String(status.chatId || "") }));
          setMessage("Telegram account connected successfully!");
          window.clearInterval(timer);
        } else if (!statusResponse.ok) {
          consecutiveErrors += 1;
          if (consecutiveErrors > 15) {
            window.clearInterval(timer);
            setMessage("Connection check timed out. Please click Connect Telegram again.");
          }
        }
      } catch {
        consecutiveErrors += 1;
        if (consecutiveErrors > 15) {
          window.clearInterval(timer);
          setMessage("Unable to reach the backend. Please try connecting again.");
        }
      }
    }, 2000);

    return () => window.clearInterval(timer);
  }, [telegramLink, telegramConnected]);

  const connectTelegram = async () => {
    setMessage("");
    try {
      const response = await fetch("/api/telegram/link", { credentials: "include" });
      const data = await readJsonResponse(response);
      if (!response.ok) {
        throw new Error(responseMessage(data, "Telegram bot is not available. Please try again later."));
      }
      if (data?.url) {
        setTelegramLink("launched");
        const opened = window.open(data.url, "_blank");
        if (!opened) {
          window.location.href = data.url;
        }
      }
    } catch (err) {
      const telegramWindow = window.open("/api/telegram/launch", "_blank");
      if (telegramWindow) {
        setTelegramLink("launched");
      } else {
        setTelegramLink("");
        setMessage(err.message || "Please allow pop-ups, then click Connect Telegram again.");
      }
    }
  };

  const cleanMyanmarLocalDigits = (raw) => {
    let digits = (raw || "").replace(/\D/g, "");
    if (digits.startsWith("95")) {
      digits = digits.slice(2);
    }
    while (digits.startsWith("0")) {
      digits = digits.slice(1);
    }
    return digits;
  };

  const normalizePhoneNumber = (value) => {
    const localDigits = cleanMyanmarLocalDigits(value);
    if (!localDigits) return "+95";
    return `+95${localDigits}`.slice(0, 14);
  };

  const updateField = (event) => {
    const { name, value } = event.target;

    if (name === "phoneNumber") {
      const localDigits = cleanMyanmarLocalDigits(value);
      setFormData((current) => ({
        ...current,
        phoneNumber: localDigits ? `+95 ${localDigits}`.slice(0, 16) : "+95 ",
      }));
      return;
    }

    setFormData((current) => ({ ...current, [name]: value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSubmitting(true);
    setMessage("");

    const phoneNumber = normalizePhoneNumber(formData.phoneNumber);
    const telegramChatId = String(formData.telegramChatId || "").trim();
    if (!formData.username.trim() || !formData.major.trim()) {
      setMessage("Username and major are required");
      setSubmitting(false);
      return;
    }
    if (phoneNumber === "+95" || !/^\+95\d{7,11}$/.test(phoneNumber)) {
      setMessage("Please enter a valid Myanmar mobile number starting with +95");
      setSubmitting(false);
      return;
    }
    if (!telegramConnected || !telegramChatId || !/^\d+$/.test(telegramChatId)) {
      setMessage("Please connect your Telegram account first");
      setSubmitting(false);
      return;
    }
    if (otpRequested && !/^\d{6}$/.test(otp.trim())) {
      setMessage("Please enter the six-digit OTP");
      setSubmitting(false);
      return;
    }

    try {
      const endpoint = otpRequested ? "/api/voters/verify-otp" : "/api/voters/request-otp";
      const body = otpRequested
        ? { phoneNumber, otp: otp.trim() }
        : {
            ...formData,
            username: formData.username.trim(),
            major: formData.major.trim(),
            phoneNumber,
            telegramChatId,
          };
      const response = await fetch(endpoint, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await readJsonResponse(response);
      if (!response.ok) {
        const operation = otpRequested ? "OTP verification" : "OTP request";
        throw new Error(responseMessage(data, `${operation} failed (${response.status})`));
      }

      if (otpRequested) {
        try {
          window.sessionStorage.removeItem(WELCOME_DRAFT_KEY);
          window.sessionStorage.removeItem(TELEGRAM_LINK_PENDING_KEY);
        } catch {
          // The completed login does not depend on draft cleanup.
        }
        saveStudentSession({
          id: data.voterId,
          username: data.username || formData.username.trim(),
          major: formData.major.trim(),
          phoneNumber: phoneNumber,
          verified: true,
          hasVoted: false,
        });
        navigate("/home");
      } else {
        setOtpRequested(true);
        setMessage(data?.message || "OTP sent successfully to your Telegram account.");
      }
    } catch (error) {
      setMessage(error.message || "Request failed");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main
      className="welcome-screen"
      style={{ "--welcome-background": `url(${backgroundImage})` }}
    >
      {/* Floating gold particles */}
      <div className="welcome-particles" aria-hidden="true">
        {particles.map((particle) => (
          <span
            className="welcome-particle"
            key={particle.id}
            style={{
              left: particle.left,
              width: particle.size,
              height: particle.size,
              opacity: particle.opacity,
              animationDuration: particle.duration,
              animationDelay: particle.delay,
            }}
          />
        ))}
      </div>

      <div className="welcome-overlay" aria-hidden="true" />

      <section className="welcome-card">

        {/* Decorative corners */}
        <span className="welcome-corner welcome-corner-top-left" />
        <span className="welcome-corner welcome-corner-top-right" />
        <span className="welcome-corner welcome-corner-bottom-left" />
        <span className="welcome-corner welcome-corner-bottom-right" />

        {/* Logo */}
        <div className="welcome-logo-wrapper">
          <img
            src={logo}
            className="welcome-logo"
            alt="Mandalay Technological University logo"
          />
        </div>

        {/* University Name */}
        <p className="welcome-university-name">
          MANDALAY TECHNOLOGICAL UNIVERSITY
        </p>

        {/* Title */}
        <h1 className="welcome-main-title">
          FRESHERS&apos;
        </h1>

        <h2 className="welcome-subtitle">
          Welcome Voting
        </h2>

        {/* Year */}
        <p className="welcome-year">
          MMXXVI • 2026
        </p>

        {/* Tagline */}
        <p className="welcome-tagline">
          Your Vote • Your Voice • Your Legacy
        </p>

        <div className={`welcome-schedule ${isVotingClosed ? "is-closed" : ""}`} role="status">
          <span className="welcome-schedule-icon" aria-hidden="true">
            <i className={`fa-solid ${isVotingClosed ? "fa-lock" : "fa-clock"}`} />
          </span>
          <div>
            <strong>{isVotingClosed ? "Voting is closed" : "Voting schedule"}</strong>
            {scheduleError ? (
              <span>{scheduleError}</span>
            ) : votingSchedule.deadline ? (
              <>
                <span>Closes {new Date(votingSchedule.deadline).toLocaleString()}</span>
                <span>{isVotingClosed ? "Votes are no longer being accepted." : `Time remaining: ${countdown?.text || "calculating..."}`}</span>
              </>
            ) : (
              <span>Voting is currently open. No closing time has been set.</span>
            )}
          </div>
        </div>

        {/* ================= FORM ================= */}
        <form
          id="welcome-voting-form"
          className="welcome-form"
          onSubmit={handleSubmit}
          noValidate
        >

          {/* Username */}
          <div className="welcome-form-group">
            <label htmlFor="username">
              Username
            </label>

            <input
              id="username"
              name="username"
              type="text"
              placeholder="Enter your username"
              autoComplete="username"
              value={formData.username}
              onChange={updateField}
              required
            />
          </div>

          {/* Major */}
          <div className="welcome-form-group">
            <label htmlFor="major">
              Major
            </label>

            <input
              id="major"
              name="major"
              type="text"
              placeholder="Enter your major"
              value={formData.major}
              onChange={updateField}
              required
            />
          </div>

          {/* Phone Number */}
          <div className="welcome-form-group">
            <label htmlFor="phoneNumber">
              PhoneNumber
            </label>

            <input
              id="phoneNumber"
              name="phoneNumber"
              type="tel"
              placeholder="+95"
              autoComplete="tel"
              value={formData.phoneNumber || "+95 "}
              onChange={updateField}
              inputMode="tel"
              required
            />
          </div>

          <div className="welcome-form-group">
            <label>Telegram Verification</label>
            <div className="telegram-connect-row">
              <button type="button" onClick={connectTelegram} disabled={telegramConnected}>
                {telegramConnected ? "✓ Telegram Connected" : telegramLink ? "Connecting... (Open Bot)" : "Connect Telegram"}
              </button>
              <input
                type="text"
                value={formData.telegramChatId || ""}
                placeholder="Chat ID"
                readOnly
                aria-label="Chat ID"
              />
            </div>
            {!telegramConnected && (
              <p style={{ fontSize: "11px", color: "#e0d0a0", marginTop: "4px", marginInline: "2px" }}>
                Click &quot;Connect Telegram&quot; and press <strong>START</strong> in the bot.
              </p>
            )}
          </div>

          {otpRequested && (
            <div className="welcome-form-group">
              <label htmlFor="otp">OTP</label>
              <input
                id="otp"
                name="otp"
                type="text"
                inputMode="numeric"
                maxLength="6"
                placeholder="Enter the 6-digit OTP"
                value={otp}
                onChange={(event) => setOtp(event.target.value)}
                required
              />
            </div>
          )}

          {message && <p className="welcome-message">{message}</p>}

          <button type="submit" className="welcome-vote-button" disabled={submitting}>
            {submitting ? "Please wait..." : otpRequested ? "Verify and Vote" : "Send OTP"}
          </button>

        </form>

        {/* Quote */}
        <p className="welcome-quote">
          &quot;Every Vote Celebrates Excellence.&quot;
        </p>

      </section>
    </main>
  );
}

export default Welcome;
