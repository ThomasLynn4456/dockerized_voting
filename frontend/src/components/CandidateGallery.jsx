import { useState } from "react";
import "./CandidateGallery.css";

export default function CandidateGallery({ candidate, resolveImageUrl, className = "" }) {
  const images = [candidate?.photo, ...(candidate?.gallery || [])]
    .filter(Boolean)
    .filter((value, index, list) => list.indexOf(value) === index);
  const [index, setIndex] = useState(0);
  const [touchStart, setTouchStart] = useState(null);

  const move = (e, direction) => {
    if (e && e.stopPropagation) e.stopPropagation();
    setIndex((current) => (current + direction + images.length) % images.length);
  };

  const handleDotClick = (e, dotIndex) => {
    if (e && e.stopPropagation) e.stopPropagation();
    setIndex(dotIndex);
  };

  const image = images[index] || "";
  if (images.length === 0) return null;

  return (
    <div
      className={`candidate-gallery ${className}`}
      onTouchStart={(event) => setTouchStart(event.touches[0].clientX)}
      onTouchEnd={(event) => {
        if (touchStart === null || images.length < 2) return;
        const distance = touchStart - event.changedTouches[0].clientX;
        if (Math.abs(distance) > 45) move(null, distance > 0 ? 1 : -1);
        setTouchStart(null);
      }}
    >
      <div className="gallery-viewport">
        <img
          key={image}
          src={resolveImageUrl(image)}
          alt={`${candidate?.name || "Candidate"} - photo ${index + 1}`}
          className="gallery-image-main"
          loading="lazy"
        />
        <div className="gallery-vignette" aria-hidden="true" />
      </div>

      {images.length > 1 && (
        <>
          <div className="gallery-count-badge" aria-hidden="true">
            <svg viewBox="0 0 24 24" className="gallery-badge-icon" fill="currentColor">
              <path d="M4 4h3l2-2h6l2 2h3a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2zm8 3a5 5 0 1 0 0 10 5 5 0 0 0 0-10zm0 2a3 3 0 1 1 0 6 3 3 0 0 1 0-6z"/>
            </svg>
            <span>{index + 1} / {images.length}</span>
          </div>

          <button
            type="button"
            className="gallery-arrow previous"
            onClick={(e) => move(e, -1)}
            aria-label="Previous image"
          >
            <svg viewBox="0 0 24 24" className="arrow-svg" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="15 18 9 12 15 6" />
            </svg>
          </button>

          <button
            type="button"
            className="gallery-arrow next"
            onClick={(e) => move(e, 1)}
            aria-label="Next image"
          >
            <svg viewBox="0 0 24 24" className="arrow-svg" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="9 18 15 12 9 6" />
            </svg>
          </button>

          <div className="gallery-dots" role="tablist" aria-label="Gallery photos">
            {images.map((_, dotIndex) => (
              <button
                type="button"
                key={dotIndex}
                className={`gallery-dot-btn ${dotIndex === index ? "active" : ""}`}
                onClick={(e) => handleDotClick(e, dotIndex)}
                aria-label={`View photo ${dotIndex + 1}`}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
