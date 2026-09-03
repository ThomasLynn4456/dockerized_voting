import { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";

export default function RequireAdmin({ children }) {
    const [isChecking, setIsChecking] = useState(true);
    const [isAuthenticated, setIsAuthenticated] = useState(false);

    useEffect(() => {
        const checkSession = async () => {
            try {
                const response = await fetch("/api/auth/session", { credentials: "include" });
                setIsAuthenticated(response.ok);
            } catch {
                setIsAuthenticated(false);
            } finally {
                setIsChecking(false);
            }
        };

        checkSession();
    }, []);

    if (isChecking) {
        return <main className="auth-page"><p className="auth-message">Checking administrator session…</p></main>;
    }

    return isAuthenticated ? children : <Navigate to="/login" replace />;
}
