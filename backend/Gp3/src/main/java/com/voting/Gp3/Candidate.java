package com.voting.Gp3;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Lob;
import jakarta.persistence.Table;
import jakarta.persistence.Transient;

@Entity
@Table(name = "candidates")
public class Candidate {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private Integer no;
    private String name;
    private String gender;
    @Transient
    private String category;

    @Transient
    private List<String> categories = new ArrayList<>();

    private Integer age;
    private String major;
    private String talent;

    @Column(columnDefinition = "TEXT")
    private String bio;

    @Lob
    @Column(columnDefinition = "LONGTEXT")
    private String photo;

    @Transient
    private Integer votes;

    @Transient
    private Long titleCandidateId;

    @Transient
    private String titleName;

    @Transient
    private List<String> titles = new ArrayList<>();

    @Transient
    private Map<String, Integer> titleVoteCounts = new HashMap<>();

    @Transient
    private Map<String, Integer> titleStudentVoteCounts = new HashMap<>();

    @Transient
    private Map<String, Integer> titleTeacherVoteCounts = new HashMap<>();

    public Candidate() {
    }

    public Candidate(Integer no, String name, String gender, Integer age, String major,
                     String talent, String bio, String photo, Integer votes) {
        this(no, name, gender, null, age, major, talent, bio, photo, votes);
    }

    public Candidate(Integer no, String name, String gender, String category, Integer age, String major,
                     String talent, String bio, String photo, Integer votes) {
        this.no = no;
        this.name = name;
        this.gender = gender;
        this.category = category;
        this.age = age;
        this.major = major;
        this.talent = talent;
        this.bio = bio;
        this.photo = photo;
        this.votes = votes;
    }

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public Integer getNo() {
        return no;
    }

    public void setNo(Integer no) {
        this.no = no;
    }

    public String getName() {
        return name;
    }

    public void setName(String name) {
        this.name = name;
    }

    public String getGender() {
        return gender;
    }

    public void setGender(String gender) {
        this.gender = gender;
    }

    public String getCategory() {
        return category;
    }

    public void setCategory(String category) {
        this.category = category;
    }

    public List<String> getCategories() {
        return categories;
    }

    public void setCategories(List<String> categories) {
        this.categories = categories == null ? new ArrayList<>() : categories;
    }

    public Integer getAge() {
        return age;
    }

    public void setAge(Integer age) {
        this.age = age;
    }

    public String getMajor() {
        return major;
    }

    public void setMajor(String major) {
        this.major = major;
    }

    public String getTalent() {
        return talent;
    }

    public void setTalent(String talent) {
        this.talent = talent;
    }

    public String getBio() {
        return bio;
    }

    public void setBio(String bio) {
        this.bio = bio;
    }

    public String getPhoto() {
        return photo;
    }

    public void setPhoto(String photo) {
        this.photo = photo;
    }

    public Integer getVotes() {
        return votes;
    }

    public void setVotes(Integer votes) {
        this.votes = votes;
    }

    public Long getTitleCandidateId() {
        return titleCandidateId;
    }

    public void setTitleCandidateId(Long titleCandidateId) {
        this.titleCandidateId = titleCandidateId;
    }

    public String getTitleName() {
        return titleName;
    }

    public void setTitleName(String titleName) {
        this.titleName = titleName;
    }

    public List<String> getTitles() {
        return titles;
    }

    public void setTitles(List<String> titles) {
        this.titles = titles == null ? new ArrayList<>() : titles;
    }

    public Map<String, Integer> getTitleVoteCounts() {
        return titleVoteCounts;
    }

    public void setTitleVoteCounts(Map<String, Integer> titleVoteCounts) {
        this.titleVoteCounts = titleVoteCounts == null ? new HashMap<>() : titleVoteCounts;
    }

    public Map<String, Integer> getTitleStudentVoteCounts() {
        return titleStudentVoteCounts;
    }

    public void setTitleStudentVoteCounts(Map<String, Integer> titleStudentVoteCounts) {
        this.titleStudentVoteCounts = titleStudentVoteCounts == null ? new HashMap<>() : titleStudentVoteCounts;
    }

    public Map<String, Integer> getTitleTeacherVoteCounts() {
        return titleTeacherVoteCounts;
    }

    public void setTitleTeacherVoteCounts(Map<String, Integer> titleTeacherVoteCounts) {
        this.titleTeacherVoteCounts = titleTeacherVoteCounts == null ? new HashMap<>() : titleTeacherVoteCounts;
    }
}
