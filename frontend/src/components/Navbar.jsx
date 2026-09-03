import { Link, useLocation } from "react-router-dom";
import "./Navbar.css";

function Navbar() {
  const location = useLocation();

  const isCurrent = (path) => location.pathname.toLowerCase() === path.toLowerCase();

  return (
    <nav className="navbar">
      <Link to="/home" className={`nav-item ${isCurrent("/home") || isCurrent("/student") || isCurrent("/") ? "active" : ""}`}>
        <i className="fa-solid fa-house"></i>
        <span>Home</span>
      </Link>

      <Link to="/boy" className={`nav-item ${isCurrent("/boy") || isCurrent("/student/boy") ? "active" : ""}`}>
        <i className="fa-solid fa-user"></i>
        <span>Boy</span>
      </Link>

      <Link to="/girl" className={`nav-item ${isCurrent("/girl") || isCurrent("/student/girl") ? "active" : ""}`}>
        <i className="fa-solid fa-user"></i>
        <span>Girl</span>
      </Link>

      <Link to="/result" className={`nav-item ${isCurrent("/result") || isCurrent("/student/result") ? "active" : ""}`}>
        <i className="fa-solid fa-chart-simple"></i>
        <span>Result</span>
      </Link>

      <Link to="/about" className={`nav-item ${isCurrent("/about") ? "active" : ""}`}>
        <i className="fa-solid fa-circle-info"></i>
        <span>About</span>
      </Link>
    </nav>
  );
}

export default Navbar;