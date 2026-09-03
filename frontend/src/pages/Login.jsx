import { useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../services/api";
import "./Auth.css";

function Login() {
    const navigate = useNavigate();
    const [username, setUsername] = useState("");
    const [password, setPassword] = useState("");
    const [message, setMessage] = useState("");

    const handleSubmit = async (event) => {
        event.preventDefault();

        try {
            const response = await api.post("/auth/login", {
                email: username,
                password,
            });

            setMessage(response.data?.message || "Login successful");
            setUsername("");
            setPassword("");
            navigate("/dashboard");
        } catch (error) {
            const errMessage = error.response?.data || "Login failed";
            setMessage(typeof errMessage === "string" ? errMessage : "Login failed");
            console.error("Login error:", error);
        }
    };

    return (
        <main className="auth-page">

            <div className="auth-card">

                <p className="auth-brand">MTU Science And Tech Club</p>
                <h1>Admin Login</h1>

                <p className="auth-subtitle">
                    Welcome back! Please login to your account.
                </p>

                <form onSubmit={handleSubmit}>

                    <div className="form-group">
                        <label htmlFor="username">
                            Username
                        </label>

                        <input
                            id="username"
                            name="username"
                            type="text"
                            value={username}
                            onChange={(event) =>
                                setUsername(event.target.value)
                            }
                            placeholder="Enter your username"
                            autoCapitalize="none"
                            autoCorrect="off"
                            spellCheck="false"
                            inputMode="text"
                            required
                        />
                    </div>

                    <div className="form-group">
                        <label htmlFor="password">
                            Password
                        </label>

                        <input
                            id="password"
                            type="password"
                            value={password}
                            onChange={(event) =>
                                setPassword(event.target.value)
                            }
                            placeholder="Enter your password"
                            required
                        />
                    </div>

                    <button
                        type="submit"
                        className="auth-button"
                    >
                        Login
                    </button>

                    {message && <p className="auth-message">{message}</p>}

                </form>

            </div>

        </main>
    );
}

export default Login;
