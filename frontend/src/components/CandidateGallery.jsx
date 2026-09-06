import { useState } from "react";
import "./CandidateGallery.css";

export default function CandidateGallery({ candidate, resolveImageUrl, className = "" }) {
  const images = [candidate?.photo, ...(candidate?.gallery || [])].filter(Boolean).filter((value, index, list) => list.indexOf(value) === index);
  const [index, setIndex] = useState(0);
  const [touchStart, setTouchStart] = useState(null);
  const move = (direction) => setIndex((current) => (current + direction + images.length) % images.length);
  const image = images[index] || "";
  if (images.length === 0) return null;
  return (
    <div className={`candidate-gallery ${className}`} onTouchStart={(event) => setTouchStart(event.touches[0].clientX)} onTouchEnd={(event) => {
      if (touchStart === null || images.length < 2) return;
      const distance = touchStart - event.changedTouches[0].clientX;
      if (Math.abs(distance) > 45) move(distance > 0 ? 1 : -1);
      setTouchStart(null);
    }}>
      <img src={resolveImageUrl(image)} alt={candidate?.name || "Candidate"} />
      {images.length > 1 && <>
        <button type="button" className="gallery-arrow previous" onClick={() => move(-1)} aria-label="Previous candidate image">‹</button>
        <button type="button" className="gallery-arrow next" onClick={() => move(1)} aria-label="Next candidate image">›</button>
        <div className="gallery-dots" aria-label={`${index + 1} of ${images.length} images`}>
          {images.map((_, dotIndex) => <button type="button" key={dotIndex} className={dotIndex === index ? "active" : ""} onClick={() => setIndex(dotIndex)} aria-label={`Show image ${dotIndex + 1}`} />)}
        </div>
      </>}
    </div>
  );
}
