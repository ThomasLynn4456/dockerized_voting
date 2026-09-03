import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { fetchCurrentStudent, saveStudentSession } from "../utils/studentSession";
import "./Welcome.css";

import logo from "./img/logo.png";
import backgroundImage from "./img/images.jpg";

const particles = Array.from({ length: 70 }, (_, index) => ({
  id: index,
  left: `${(index * 37) % 100}%`,
  duration: `${4 + ((index * 17) % 7)}s`,
  delay: `${((index * 13) % 50) / 10}s`,
  opacity: 0.25 + ((index * 29) % 70) / 100,
  size: `${3 + ((index * 11) % 4)}px`,
}));

function Welcome() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({ username: "", major: "", phoneNumber: "", telegramChatId: "" });
  const [otp, setOtp] = useState("");
  const [otpRequested, setOtpRequested] = useState(false);
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [telegramLink, setTelegramLink] = useState("");
  const [telegramConnected, setTelegramConnected] = useState(false);

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

    const timer = window.setInterval(async () => {
      const statusResponse = await fetch("/api/telegram/link/status", { credentials: "include" });
      const status = await statusResponse.json();
      if (status.linked) {
        setTelegramConnected(true);
        setFormData((current) => ({ ...current, telegramChatId: status.chatId }));
        window.clearInterval(timer);
      }
    }, 2000);

    return () => window.clearInterval(timer);
  }, [telegramLink, telegramConnected]);

  const connectTelegram = async () => {
    setMessage("");
    const telegramWindow = window.open("about:blank", "_blank");
    try {
      const response = await fetch("/api/telegram/link", { credentials: "include" });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || "Telegram is unavailable");
      setTelegramLink(data.url);
      if (telegramWindow) {
        telegramWindow.location.href = data.url;
      } else {
        setMessage("Please allow pop-ups, then click Connect Telegram again");
      }
    } catch (error) {
      telegramWindow?.close();
      setMessage(error.message || "Unable to connect to Telegram");
    }
  };

  const normalizePhoneNumber = (value) => {
    const digits = (value || "").replace(/\D/g, "");

    if (!digits) return "+95";

    const localDigits = digits.startsWith("95")
      ? digits.slice(2)
      : digits.startsWith("9")
        ? digits.slice(1)
        : digits.startsWith("0")
          ? digits.slice(1)
          : digits;

    return `+95${localDigits}`.slice(0, 13);
  };

  const updateField = (event) => {
    const { name, value } = event.target;

    if (name === "phoneNumber") {
      const digits = value.replace(/\D/g, "");
      const localDigits = digits.startsWith("95")
        ? digits.slice(2)
        : digits.startsWith("9")
          ? digits.slice(1)
          : digits.startsWith("0")
            ? digits.slice(1)
            : digits;

      setFormData({ ...formData, [name]: `+95 ${localDigits}`.slice(0, 14) });
      return;
    }

    setFormData({ ...formData, [name]: value });
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSubmitting(true);
    setMessage("");

    const phoneNumber = normalizePhoneNumber(formData.phoneNumber);
    const telegramChatId = String(formData.telegramChatId || "").trim();
    if (phoneNumber === "+95" || !/^\+95\d{9,10}$/.test(phoneNumber)) {
      setMessage("Please enter a valid Myanmar mobile number starting with +95");
      setSubmitting(false);
      return;
    }
    if (!telegramConnected || !telegramChatId || !/^\d+$/.test(telegramChatId)) {
      setMessage("Please connect your Telegram account first");
      setSubmitting(false);
      return;
    }

    try {
      const endpoint = otpRequested ? "/api/voters/verify-otp" : "/api/voters/request-otp";
      const body = otpRequested
        ? { phoneNumber, otp }
        : { ...formData, phoneNumber, telegramChatId };
      const response = await fetch(endpoint, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data || "Request failed");

      if (otpRequested) {
        saveStudentSession({
          id: data.voterId,
          username: data.username || formData.username,
          major: formData.major,
          phoneNumber: phoneNumber,
          verified: true,
          hasVoted: false
        });
        navigate("/home");
      } else {
        setOtpRequested(true);
        setMessage(data.message);
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

        {/* ================= FORM ================= */}
        <form
          id="welcome-voting-form"
          className="welcome-form"
          onSubmit={handleSubmit}
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
            <label>Telegram</label>
            <div className="telegram-connect-row">
              <button type="button" onClick={connectTelegram} disabled={telegramConnected}>
                {telegramConnected ? "Telegram connected" : "Connect Telegram"}
              </button>
              <input
                type="text"
                value={formData.telegramChatId}
                placeholder="Chat ID appears after connecting"
                readOnly
                aria-label="Telegram chat ID"
              />
            </div>
          </div>

          {otpRequested && (
            <div className="welcome-form-group">
              <label htmlFor="otp">OTP</label>
              <input
                id="otp"
                name="otp"
                type="text"
                inputMode="numeric"
                pattern="[0-9]{6}"
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