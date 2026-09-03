import { BrowserRouter, Routes, Route, useLocation, Navigate } from "react-router-dom";

import Navbar from "./components/Navbar";
import RequireAdmin from "./components/RequireAdmin";

import Home from "./pages/Home";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import Welcome from "./pages/Welcome";
import Boy from "./pages/Boy";
import Girl from "./pages/Girl";
import About from "./pages/About";
import Result from "./pages/Result";
import TeacherVotePage from "./pages/TeacherVotePage";
import "./Responsive.css";

function AppContent() {
    const location = useLocation();

    const hideNavbarOn = ["/", "/welcome", "/login", "/dashboard", "/teacher-vote"];
    const showNavbar = !hideNavbarOn.includes(location.pathname);

    return (
        <>
            <Routes>

                {/* Public pages */}
                <Route path="/" element={<Welcome />} />
                <Route path="/welcome" element={<Welcome />} />
                <Route path="/about" element={<About />} />
                <Route path="/login" element={<Login />} />

                {/* Student isolated area */}
                <Route path="/home" element={<Home />} />
                <Route path="/student" element={<Home />} />

                <Route path="/boy" element={<Boy voterType="student" />} />
                <Route path="/student/boy" element={<Boy voterType="student" />} />

                <Route path="/girl" element={<Girl voterType="student" />} />
                <Route path="/student/girl" element={<Girl voterType="student" />} />

                <Route path="/result" element={<Result />} />
                <Route path="/student/result" element={<Result />} />

                {/* Other pages */}
                <Route path="/dashboard" element={<RequireAdmin><Dashboard /></RequireAdmin>} />
                <Route path="/teacher-vote" element={<TeacherVotePage />} />

                {/* Fallback route */}
                <Route path="*" element={<Navigate to="/welcome" replace />} />

            </Routes>

            {showNavbar && <Navbar />}
        </>
    );
}

function App() {
    return (
        <BrowserRouter>
            <AppContent />
        </BrowserRouter>
    );
}

export default App;
