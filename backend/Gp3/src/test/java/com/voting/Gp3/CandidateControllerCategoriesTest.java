package com.voting.Gp3;

import java.util.HashSet;
import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;
import org.junit.jupiter.api.Test;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;

import com.voting.Gp3.controller.CandidateController;
import com.voting.Gp3.repository.CandidateRepository;
import com.voting.Gp3.service.ImageStorageService;

class CandidateControllerCategoriesTest {

    @Test
    void createCandidateUsesExplicitSelectedCategories() {
        CandidateRepository repository = mock(CandidateRepository.class);
        ImageStorageService imageStorageService = mock(ImageStorageService.class);
        CandidateController controller = new CandidateController(repository, imageStorageService);

        Candidate candidate = new Candidate();
        candidate.setName("Aye Pyae");
        candidate.setGender("Female");
        candidate.setCategories(List.of("Queen", "Style", "Ms. Popular", "Princess"));
        candidate.setAge(22);
        candidate.setMajor("CS");
        candidate.setTalent("Dancing");
        candidate.setBio("Creative and active");

        when(repository.save(any(Candidate.class))).thenAnswer(invocation -> {
            Candidate saved = invocation.getArgument(0);
            saved.setId(1L);
            return saved;
        });

        ResponseEntity<?> response = controller.createCandidate(candidate);

        assertEquals(HttpStatus.CREATED, response.getStatusCode());
        @SuppressWarnings("unchecked")
        List<Candidate> savedCandidates = (List<Candidate>) response.getBody();
        assertEquals(4, savedCandidates.size());
        assertEquals(
            new HashSet<>(List.of("Queen", "Style", "Ms. Popular", "Princess")),
            new HashSet<>(savedCandidates.stream().map(saved -> saved.getCategory()).toList())
        );
        verify(repository, times(4)).save(any(Candidate.class));
    }
}
