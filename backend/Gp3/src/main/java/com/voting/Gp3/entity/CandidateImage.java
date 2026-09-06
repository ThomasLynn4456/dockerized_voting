package com.voting.Gp3.entity;

import com.voting.Gp3.Candidate;
import jakarta.persistence.*;

@Entity
@Table(name = "candidate_images")
public class CandidateImage {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    @ManyToOne(fetch = FetchType.LAZY, optional = false) @JoinColumn(name = "candidate_id", nullable = false)
    private Candidate candidate;
    @Column(name = "image_path", nullable = false, length = 500)
    private String imagePath;
    @Column(name = "display_order", nullable = false)
    private Integer displayOrder = 0;
    public Long getId() { return id; }
    public Candidate getCandidate() { return candidate; }
    public void setCandidate(Candidate candidate) { this.candidate = candidate; }
    public String getImagePath() { return imagePath; }
    public void setImagePath(String imagePath) { this.imagePath = imagePath; }
    public Integer getDisplayOrder() { return displayOrder; }
    public void setDisplayOrder(Integer displayOrder) { this.displayOrder = displayOrder; }
}
