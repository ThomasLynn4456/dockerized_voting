import { useNavigate } from "react-router-dom";
import logo from "./img/logo1.png";
import "./About.css";

function About() {
  const navigate = useNavigate();

  return (
    <div className="about-page">
      <header className="about-header">
        <div className="about-header-logo">
          <img src={logo} alt="University logo" />
        </div>

        <div className="about-header-title">
          <h3>FRESHERS&apos; WELCOME VOTING</h3>
        </div>

        <button
          type="button"
          className="about-back-button"
          onClick={() => navigate(-1)}
          aria-label="Go back"
        >
          <i className="fa-solid fa-chevron-left" aria-hidden="true"></i>
        </button>
      </header>

      <main className="about-content">
        <section className="about-heading">
          <div className="about-script">Freshers&apos; Welcome</div>
          <h1>About Voting</h1>
          <p>
            A celebration of confidence, talent, friendship and university
            spirit.
          </p>
        </section>

        <section className="about-cards" aria-label="Voting information">
          <article className="about-card">
            <i className="fa-solid fa-star" aria-hidden="true"></i>
            <h2>Our Event</h2>
            <p>
              Celebrate brilliance and empower your favorites. Your vote defines the leaderboard for this year's the whole titles. Make your choice and crown the next legends.
            </p>
          </article>

          <article className="about-card">
            <i className="fa-solid fa-check-double" aria-hidden="true"></i>
            <h2>Voting Rules</h2>
            <p>
              Select one title per candidate and check your choices carefully before submitting. <br /> 
              Limit: One vote per account.
              
            </p>
          </article>

          <article className="about-card">
            <i className="fa-solid fa-envelope" aria-hidden="true"></i>
            <h2>Contact</h2>
            <p>
              For technical support or general inquiries, reach out to our support team at <a href="mailto:quantivex3@gmail.com" className="contact-link">quantivex3@gmail.com</a> or
              call  <a href="tel: 09457552640" className="contact-link">
                09-457552640</a>. Our team is here to assist you promptly. <br />
              Developers: Quantivex Members < br /> (Mentor - Mg Zin Lin Htet) 
            </p>
          </article>
        </section>

        <section className="about-thank-you">
          
          <h2>Thank You for Participating</h2>
          <p>Bring your favorite candidates into the spotlight at Freshers' Welcome.</p>
        </section>
      </main>
    </div>
  );
}

export default About;