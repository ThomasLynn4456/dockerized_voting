package com.voting.Gp3.entity;

import java.time.Instant;

import com.voting.Gp3.Candidate;
import com.voting.Gp3.Title;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;

@Entity
@Table(name = "published_title_results", uniqueConstraints = @UniqueConstraint(columnNames = "title_id"))
public class PublishedTitleResult {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(optional = false)
    @JoinColumn(name = "title_id", nullable = false)
    private Title title;

    @ManyToOne(optional = false)
    @JoinColumn(name = "candidate_id", nullable = false)
    private Candidate candidate;

    @Column(nullable = false)
    private int studentWeight;

    @Column(nullable = false)
    private int teacherWeight;

    @Column(nullable = false)
    private Instant publishedAt;

    public Long getId() { return id; }
    public Title getTitle() { return title; }
    public void setTitle(Title title) { this.title = title; }
    public Candidate getCandidate() { return candidate; }
    public void setCandidate(Candidate candidate) { this.candidate = candidate; }
    public int getStudentWeight() { return studentWeight; }
    public void setStudentWeight(int studentWeight) { this.studentWeight = studentWeight; }
    public int getTeacherWeight() { return teacherWeight; }
    public void setTeacherWeight(int teacherWeight) { this.teacherWeight = teacherWeight; }
    public Instant getPublishedAt() { return publishedAt; }
    public void setPublishedAt(Instant publishedAt) { this.publishedAt = publishedAt; }
}
