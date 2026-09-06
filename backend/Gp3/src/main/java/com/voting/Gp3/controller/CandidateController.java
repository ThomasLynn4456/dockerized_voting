package com.voting.Gp3.controller;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.core.io.Resource;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.voting.Gp3.Candidate;
import com.voting.Gp3.Title;
import com.voting.Gp3.TitleCandidate;
import com.voting.Gp3.repository.CandidateRepository;
import com.voting.Gp3.repository.CandidateImageRepository;
import com.voting.Gp3.entity.CandidateImage;
import com.voting.Gp3.repository.TitleCandidateRepository;
import com.voting.Gp3.repository.TitleRepository;
import com.voting.Gp3.service.ImageStorageService;
import com.voting.Gp3.service.TitleTableService;

@RestController
@RequestMapping("/api")
public class CandidateController {

    private final CandidateRepository candidateRepository;
    private final ImageStorageService imageStorageService;
    private final TitleRepository titleRepository;
    private final TitleCandidateRepository titleCandidateRepository;
    private final TitleTableService titleTableService;
    private final CandidateImageRepository candidateImageRepository;

    public CandidateController(CandidateRepository candidateRepository, ImageStorageService imageStorageService) {
        this(candidateRepository, imageStorageService, null, null, null, null);
    }

    public CandidateController(CandidateRepository candidateRepository, ImageStorageService imageStorageService,
                               TitleRepository titleRepository, TitleCandidateRepository titleCandidateRepository) {
        this(candidateRepository, imageStorageService, titleRepository, titleCandidateRepository, null, null);
    }

    public CandidateController(CandidateRepository candidateRepository, ImageStorageService imageStorageService,
                               TitleRepository titleRepository, TitleCandidateRepository titleCandidateRepository,
                               TitleTableService titleTableService) {
        this(candidateRepository, imageStorageService, titleRepository, titleCandidateRepository, titleTableService, null);
    }

    @Autowired
    public CandidateController(CandidateRepository candidateRepository, ImageStorageService imageStorageService,
                               TitleRepository titleRepository, TitleCandidateRepository titleCandidateRepository,
                               TitleTableService titleTableService, CandidateImageRepository candidateImageRepository) {
        this.candidateRepository = candidateRepository;
        this.imageStorageService = imageStorageService;
        this.titleRepository = titleRepository;
        this.titleCandidateRepository = titleCandidateRepository;
        this.titleTableService = titleTableService;
        this.candidateImageRepository = candidateImageRepository;
    }

    private List<String> getCategoriesForGender(String gender) {
        List<String> categoriesFromDb = new ArrayList<>();
        if (titleRepository != null) {
            for (Title title : titleRepository.findAll()) {
                if (title.getGender() != null && title.getGender().equalsIgnoreCase(gender)) {
                    categoriesFromDb.add(title.getName());
                }
            }
        }
        if (!categoriesFromDb.isEmpty()) {
            return categoriesFromDb;
        }

        if ("Male".equalsIgnoreCase(gender)) {
            return List.of("King", "Smart", "Mr. Popular");
        }

        if ("Female".equalsIgnoreCase(gender)) {
            return List.of("Queen", "Style", "Ms. Popular");
        }

        return List.of();
    }

    private List<String> normalizeCategories(List<String> rawCategories) {
        if (rawCategories == null || rawCategories.isEmpty()) {
            return List.of();
        }

        return rawCategories.stream()
            .filter(category -> category != null && !category.isBlank())
            .map(category -> category == null ? "" : category.trim())
            .distinct()
            .toList();
    }

    private String saveCandidateImageIfNeeded(String imageValue) {
        if (imageValue == null || imageValue.isBlank()) {
            return null;
        }

        String savedImage = imageStorageService.storeImageFromDataUrl(imageValue);
        return savedImage == null ? imageValue : savedImage;
    }

    @GetMapping("/candidates")
    public List<Candidate> getCandidates() {
        Map<Long, Candidate> candidateMap = new LinkedHashMap<>();

        if (titleTableService != null) {
            for (Title title : titleRepository.findAll()) {
                for (var row : titleTableService.rows(title)) {
                    Long candidateId = ((Number) row.get("candidate_id")).longValue();
                    Candidate candidate = candidateRepository.findById(candidateId).orElse(null);
                    if (candidate == null) continue;

                    Candidate existing = candidateMap.computeIfAbsent(candidateId, id -> copyCandidate(candidate));
                    addGallery(existing);
                    existing.getTitles().add(title.getName());
                    Number votesNum = (Number) row.get("votes");
                    Number studentVotesNum = (Number) row.get("student_votes");
                    Number teacherVotesNum = (Number) row.get("teacher_votes");
                    Number noNum = (Number) row.get("no");

                    existing.getTitleVoteCounts().put(title.getName(), Integer.valueOf(votesNum != null ? votesNum.intValue() : 0));
                    existing.getTitleStudentVoteCounts().put(title.getName(), Integer.valueOf(studentVotesNum != null ? studentVotesNum.intValue() : 0));
                    existing.getTitleTeacherVoteCounts().put(title.getName(), Integer.valueOf(teacherVotesNum != null ? teacherVotesNum.intValue() : 0));
                    existing.setCategory(existing.getCategory() == null ? title.getName() : existing.getCategory());
                    existing.setTitleName(existing.getTitleName() == null ? title.getName() : existing.getTitleName());
                    existing.setNo(existing.getNo() != null ? existing.getNo() : Integer.valueOf(noNum != null ? noNum.intValue() : 0));
                    existing.setVotes(existing.getVotes() != null ? existing.getVotes() : Integer.valueOf(votesNum != null ? votesNum.intValue() : 0));
                }
            }
            return new ArrayList<>(candidateMap.values());
        }

        if (titleRepository == null) {
            return candidateRepository.findAll();
        }

        for (Candidate candidate : candidateRepository.findAll()) {
            Candidate existing = candidateMap.computeIfAbsent(candidate.getId(), id -> copyCandidate(candidate));
            addGallery(existing);
            List<TitleCandidate> links = titleCandidateRepository.findByCandidate(candidate);
            if (links.isEmpty()) {
                existing.getTitles().add(candidate.getCategory() == null ? "General" : candidate.getCategory());
                continue;
            }

            for (TitleCandidate link : links) {
                existing.getTitles().add(link.getTitle().getName());
                existing.setTitleCandidateId(existing.getTitleCandidateId() == null ? link.getId() : existing.getTitleCandidateId());
                Integer linkVotes = link.getVotes();
                Integer existingVotes = existing.getVotes();
                if (existingVotes == null) {
                    existing.setVotes(linkVotes);
                } else {
                    int currentLinkVotes = linkVotes != null ? linkVotes.intValue() : 0;
                    existing.setVotes(Integer.valueOf(Math.max(existingVotes.intValue(), currentLinkVotes)));
                }
            }
        }

        return new ArrayList<>(candidateMap.values());
    }

    private void addGallery(Candidate candidate) {
        if (candidateImageRepository == null || candidate == null) return;
        candidate.setGallery(candidateImageRepository.findAllByCandidateOrderByDisplayOrderAscIdAsc(candidate).stream()
            .map(CandidateImage::getImagePath).toList());
    }

    @GetMapping("/candidates/{id}/images")
    public ResponseEntity<?> getCandidateImages(@PathVariable Long id) {
        Candidate candidate = candidateRepository.findById(id).orElse(null);
        if (candidate == null) return ResponseEntity.notFound().build();
        return ResponseEntity.ok(candidateImageRepository.findAllByCandidateOrderByDisplayOrderAscIdAsc(candidate).stream()
            .map(CandidateImage::getImagePath).toList());
    }

    @PostMapping("/candidates/{id}/images")
    @Transactional
    public ResponseEntity<?> addCandidateImage(@PathVariable Long id, @RequestBody Map<String, String> payload) {
        Candidate candidate = candidateRepository.findById(id).orElse(null);
        String image = payload == null ? null : payload.get("image");
        if (candidate == null) return ResponseEntity.notFound().build();
        if (image == null || image.isBlank()) return ResponseEntity.badRequest().body("An image is required.");
        CandidateImage record = new CandidateImage();
        record.setCandidate(candidate);
        record.setImagePath(saveCandidateImageIfNeeded(image));
        record.setDisplayOrder(candidateImageRepository.findAllByCandidateOrderByDisplayOrderAscIdAsc(candidate).size());
        return ResponseEntity.status(HttpStatus.CREATED).body(candidateImageRepository.save(record).getImagePath());
    }

    @DeleteMapping("/candidates/{candidateId}/images/{imageId}")
    @Transactional
    public ResponseEntity<?> deleteCandidateImage(@PathVariable Long candidateId, @PathVariable Long imageId) {
        CandidateImage record = candidateImageRepository.findById(imageId).orElse(null);
        if (record == null || record.getCandidate().getId() == null || !record.getCandidate().getId().equals(candidateId)) {
            return ResponseEntity.notFound().build();
        }
        imageStorageService.deleteImage(record.getImagePath());
        candidateImageRepository.delete(record);
        return ResponseEntity.noContent().build();
    }

    private Candidate copyCandidate(Candidate source) {
        Candidate copy = new Candidate(source.getNo(), source.getName(), source.getGender(), source.getAge(),
            source.getMajor(), source.getTalent(), source.getBio(), source.getPhoto(), source.getVotes());
        copy.setId(source.getId());
        return copy;
    }

    @GetMapping({"/candidates_images/{filename}", "/api/candidates_images/{filename}"})
    public ResponseEntity<Resource> getCandidateImage(@PathVariable String filename) throws IOException {
        Path imagePath = imageStorageService.resolveImage(filename);

        if (imagePath == null || !Files.isRegularFile(imagePath)) {
            return ResponseEntity.notFound().build();
        }

        String contentType = Files.probeContentType(imagePath);
        if (contentType == null) {
            contentType = MediaType.APPLICATION_OCTET_STREAM_VALUE;
        }

        return ResponseEntity.ok()
            .contentType(MediaType.parseMediaType(contentType))
            .header(HttpHeaders.CACHE_CONTROL, "max-age=3600")
            .body(new org.springframework.core.io.FileSystemResource(imagePath));
    }

    @PostMapping("/candidates")
    @Transactional
    public ResponseEntity<?> createCandidate(@RequestBody Candidate candidate) {
        if (candidate.getName() == null || candidate.getName().isBlank()) {
            return ResponseEntity.badRequest().body("Candidate name is required.");
        }

        String gender = candidate.getGender();
        List<String> categories = normalizeCategories(candidate.getCategories());
        if (categories.isEmpty()) {
            categories = getCategoriesForGender(gender);
        }
        if (categories.isEmpty()) {
            return ResponseEntity.badRequest().body("Gender must be Male or Female, or at least one category must be selected.");
        }

        if (titleRepository != null && (candidate.getNo() == null || candidate.getNo() < 1)) {
            return ResponseEntity.badRequest().body("Candidate number must be a positive number.");
        }
        if (titleRepository != null
                && candidateRepository.existsByNoAndGenderIgnoreCase(candidate.getNo(), gender)) {
            return ResponseEntity.status(HttpStatus.CONFLICT).body(
                "Candidate number " + candidate.getNo() + " already exists for " + gender + " candidates."
            );
        }

        if (titleTableService != null) {
            return createPhysicalTableCandidate(candidate, categories);
        }
        if (titleRepository != null) {
            return createLinkedCandidate(candidate, categories);
        }

        String storedPhoto = saveCandidateImageIfNeeded(candidate.getPhoto());

        List<Candidate> savedCandidates = new ArrayList<>();
        for (String category : categories) {
            Candidate categoryCandidate = new Candidate();
            categoryCandidate.setNo(candidate.getNo());
            categoryCandidate.setName(candidate.getName());
            categoryCandidate.setGender(gender);
            categoryCandidate.setCategory(category);
            categoryCandidate.setAge(candidate.getAge());
            categoryCandidate.setMajor(candidate.getMajor());
            categoryCandidate.setTalent(candidate.getTalent());
            categoryCandidate.setBio(candidate.getBio());
            categoryCandidate.setPhoto(storedPhoto);
            Integer candidateVotes = candidate.getVotes();
            categoryCandidate.setVotes(candidateVotes == null ? 0 : candidateVotes);
            savedCandidates.add(candidateRepository.save(categoryCandidate));
        }

        return ResponseEntity.status(HttpStatus.CREATED).body(savedCandidates);
    }

    private ResponseEntity<?> createPhysicalTableCandidate(Candidate candidate, List<String> categories) {
        String storedPhoto = saveCandidateImageIfNeeded(candidate.getPhoto());
        Candidate newCandidate = new Candidate();
        newCandidate.setNo(candidate.getNo());
        newCandidate.setName(candidate.getName());
        newCandidate.setGender(candidate.getGender());
        newCandidate.setAge(candidate.getAge());
        newCandidate.setMajor(candidate.getMajor());
        newCandidate.setTalent(candidate.getTalent());
        newCandidate.setBio(candidate.getBio());
        newCandidate.setPhoto(storedPhoto);
        final Candidate savedCandidate = candidateRepository.save(newCandidate);

        for (String categoryName : categories) {
            Title title = titleRepository.findByNameIgnoreCase(categoryName).orElseGet(() -> {
                Title newTitle = new Title();
                newTitle.setName(categoryName);
                newTitle.setGender(savedCandidate.getGender());
                return titleRepository.save(newTitle);
            });

            titleTableService.createTable(title);

            if (title.getGender() != null && title.getGender().equalsIgnoreCase(savedCandidate.getGender())) {
                titleTableService.addCandidate(title, savedCandidate);
            }
        }
        return ResponseEntity.status(HttpStatus.CREATED).body(getPhysicalTableLinks(savedCandidate));
    }

    private List<Candidate> getPhysicalTableLinks(Candidate candidate) {
        List<Candidate> response = new ArrayList<>();
        for (Title title : titleRepository.findAll()) {
            if (title.getGender() != null && !title.getGender().equalsIgnoreCase(candidate.getGender())) {
                continue;
            }
            for (var row : titleTableService.rows(title)) {
                if (((Number) row.get("candidate_id")).longValue() != candidate.getId()) continue;
                Candidate copy = copyCandidate(candidate);
                copy.setCategory(title.getName());
                copy.setTitleName(title.getName());
                Number candidateNo = (Number) row.get("no");
                Number candidateVotes = (Number) row.get("votes");
                copy.setNo(candidateNo == null ? null : Integer.valueOf(candidateNo.intValue()));
                copy.setVotes(candidateVotes == null ? 0 : Integer.valueOf(candidateVotes.intValue()));
                response.add(copy);
            }
        }
        return response;
    }

    private ResponseEntity<?> createLinkedCandidate(Candidate candidate, List<String> categories) {
        String storedPhoto = saveCandidateImageIfNeeded(candidate.getPhoto());
        Candidate savedCandidate = new Candidate();
        savedCandidate.setNo(candidate.getNo());
        savedCandidate.setName(candidate.getName());
        savedCandidate.setGender(candidate.getGender());
        savedCandidate.setAge(candidate.getAge());
        savedCandidate.setMajor(candidate.getMajor());
        savedCandidate.setTalent(candidate.getTalent());
        savedCandidate.setBio(candidate.getBio());
        savedCandidate.setPhoto(storedPhoto);
        savedCandidate = candidateRepository.save(savedCandidate);

        List<Candidate> response = new ArrayList<>();
        for (String category : categories) {
            Title title = titleRepository.findByNameIgnoreCase(category).orElse(null);
            if (title == null) {
                continue;
            }
            TitleCandidate link = new TitleCandidate();
            link.setCandidate(savedCandidate);
            link.setTitle(title);
            link.setNo(candidate.getNo());
            link.setVotes(0);
            titleCandidateRepository.save(link);
            Candidate copy = copyCandidate(savedCandidate);
            copy.setCategory(title.getName());
            copy.setVotes(0);
            copy.setTitleCandidateId(link.getId());
            response.add(copy);
        }
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    @PutMapping("/candidates/{id}")
    @Transactional
    public ResponseEntity<?> updateCandidate(@PathVariable Long id, @RequestBody Candidate candidate) {
        if (titleRepository != null && (candidate.getNo() == null || candidate.getNo() < 1)) {
            return ResponseEntity.badRequest().body("Candidate number must be a positive number.");
        }
        if (titleRepository != null
                && candidateRepository.existsByNoAndGenderIgnoreCaseAndIdNot(
                    candidate.getNo(), candidate.getGender(), id)) {
            return ResponseEntity.status(HttpStatus.CONFLICT).body(
                "Candidate number " + candidate.getNo() + " already exists for "
                    + candidate.getGender() + " candidates."
            );
        }
        if (titleTableService != null) {
            return updatePhysicalTableCandidate(id, candidate);
        }
        if (titleRepository != null) {
            return updateLinkedCandidate(id, candidate);
        }
        return candidateRepository.findById(id)
            .map(existingCandidate -> {
                List<Candidate> relatedCandidates = candidateRepository.findByNameAndNoAndGender(
                    existingCandidate.getName(),
                    existingCandidate.getNo(),
                    existingCandidate.getGender()
                );

                if (relatedCandidates.isEmpty()) {
                    relatedCandidates = List.of(existingCandidate);
                }

                String incomingPhoto = candidate.getPhoto();
                String storedPhoto = saveCandidateImageIfNeeded(incomingPhoto);
                if (storedPhoto != null && !storedPhoto.equals(existingCandidate.getPhoto()) && existingCandidate.getPhoto() != null 
                        && !existingCandidate.getPhoto().startsWith("http") && existingCandidate.getPhoto().contains("candidates_images/")) {
                    imageStorageService.deleteImage(existingCandidate.getPhoto());
                }

                for (Candidate relatedCandidate : relatedCandidates) {
                    relatedCandidate.setNo(candidate.getNo());
                    relatedCandidate.setName(candidate.getName());
                    relatedCandidate.setGender(candidate.getGender());
                    relatedCandidate.setAge(candidate.getAge());
                    relatedCandidate.setMajor(candidate.getMajor());
                    relatedCandidate.setTalent(candidate.getTalent());
                    relatedCandidate.setBio(candidate.getBio());
                    relatedCandidate.setPhoto(storedPhoto != null ? storedPhoto : relatedCandidate.getPhoto());
                    if (candidate.getVotes() != null) {
                        relatedCandidate.setVotes(candidate.getVotes());
                    }
                }

                candidateRepository.saveAll(relatedCandidates);
                return ResponseEntity.ok(relatedCandidates);
            })
            .orElse(ResponseEntity.notFound().build());
    }

    private ResponseEntity<?> updatePhysicalTableCandidate(Long id, Candidate candidate) {
        return candidateRepository.findById(id).map(existing -> {
            String oldPhoto = existing.getPhoto();
            String storedPhoto = saveCandidateImageIfNeeded(candidate.getPhoto());
            if (candidate.getNo() != null && candidate.getNo() > 0) {
                existing.setNo(candidate.getNo());
            }
            existing.setName(candidate.getName());
            existing.setGender(candidate.getGender());
            existing.setAge(candidate.getAge());
            existing.setMajor(candidate.getMajor());
            existing.setTalent(candidate.getTalent());
            existing.setBio(candidate.getBio());
            existing.setPhoto(storedPhoto != null ? storedPhoto : oldPhoto);
            candidateRepository.save(existing);

            List<String> requestedCategories = normalizeCategories(candidate.getCategories());
            if (requestedCategories.isEmpty()) {
                requestedCategories = getCategoriesForGender(existing.getGender());
            }

            for (Title title : titleRepository.findAll()) {
                boolean genderMatches = title.getGender() != null && title.getGender().equalsIgnoreCase(existing.getGender());
                boolean categoryRequested = requestedCategories.stream().anyMatch(c -> c.equalsIgnoreCase(title.getName()));

                if (genderMatches && categoryRequested) {
                    titleTableService.createTable(title);
                    titleTableService.addCandidate(title, existing);
                } else {
                    titleTableService.removeCandidate(title, id);
                }
                titleTableService.resequence(title);
            }

            if (storedPhoto != null && !storedPhoto.equals(oldPhoto) && oldPhoto != null && oldPhoto.contains("candidates_images/")) {
                imageStorageService.deleteImage(oldPhoto);
            }

            return ResponseEntity.ok(getPhysicalTableLinks(existing));
        }).orElse(ResponseEntity.notFound().build());
    }

    private ResponseEntity<?> updateLinkedCandidate(Long id, Candidate candidate) {
        return candidateRepository.findById(id).map(existing -> {
            String oldPhoto = existing.getPhoto();
            String storedPhoto = saveCandidateImageIfNeeded(candidate.getPhoto());
            existing.setNo(candidate.getNo());
            existing.setName(candidate.getName());
            existing.setGender(candidate.getGender());
            existing.setAge(candidate.getAge());
            existing.setMajor(candidate.getMajor());
            existing.setTalent(candidate.getTalent());
            existing.setBio(candidate.getBio());
            existing.setPhoto(storedPhoto != null ? storedPhoto : oldPhoto);
            candidateRepository.save(existing);
            if (storedPhoto != null && !storedPhoto.equals(oldPhoto) && oldPhoto != null && oldPhoto.contains("candidates_images/")) {
                imageStorageService.deleteImage(oldPhoto);
            }
            return ResponseEntity.ok(getCandidateLinks(existing));
        }).orElse(ResponseEntity.notFound().build());
    }

    private List<Candidate> getCandidateLinks(Candidate candidate) {
        List<Candidate> response = new ArrayList<>();
        for (TitleCandidate link : titleCandidateRepository.findByCandidate(candidate)) {
            Candidate copy = copyCandidate(candidate);
            copy.setCategory(link.getTitle().getName());
            copy.setVotes(link.getVotes());
            copy.setNo(link.getNo());
            copy.setTitleCandidateId(link.getId());
            response.add(copy);
        }
        return response;
    }

    @DeleteMapping("/candidates/{id}")
    @Transactional
    public ResponseEntity<Void> deleteCandidate(@PathVariable Long id) {
        Candidate candidate = candidateRepository.findById(id).orElse(null);
        if (candidate == null) {
            return ResponseEntity.notFound().build();
        }

        String candidatePhoto = candidate.getPhoto();

        if (titleTableService != null) {
            for (Title title : titleRepository.findAll()) {
                titleTableService.removeCandidate(title, id);
            }
        } else if (titleRepository != null) {
            titleCandidateRepository.findByCandidate(candidate).forEach(titleCandidateRepository::delete);
        }

        candidateRepository.deleteById(id);
        candidateRepository.flush();

        if (candidatePhoto != null && candidatePhoto.contains("candidates_images/")) {
            imageStorageService.deleteImage(candidatePhoto);
        }

        return ResponseEntity.noContent().build();
    }

    @PutMapping("/title-candidates/{id}/vote")
    @Transactional
    public ResponseEntity<?> voteForTitleCandidate(@PathVariable Long id) {
        if (titleCandidateRepository == null) {
            return ResponseEntity.notFound().build();
        }
        return titleCandidateRepository.findById(id).map(link -> {
            link.setVotes(link.getVotes() == null ? 1 : link.getVotes() + 1);
            titleCandidateRepository.save(link);
            return ResponseEntity.ok(link.getVotes());
        }).orElse(ResponseEntity.notFound().build());
    }

}
