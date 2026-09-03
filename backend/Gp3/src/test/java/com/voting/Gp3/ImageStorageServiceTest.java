package com.voting.Gp3;

import static org.assertj.core.api.Assertions.assertThat;

import java.nio.file.Files;
import java.nio.file.Path;

import org.junit.jupiter.api.Test;

import com.voting.Gp3.service.ImageStorageService;

class ImageStorageServiceTest {

    @Test
    void storeImageFromDataUrl_savesFileToFolderAndReturnsRelativePath() throws Exception {
        Path tempDirectory = Files.createTempDirectory("candidate-images-test");
        ImageStorageService service = new ImageStorageService(tempDirectory);

        String dataUrl = "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wCEAAkGBxAQEBUQEBAVFhUVFRUVFRUVFRUVFRUYFRUYFRUYHSggGBolHRUVITEhJSkrLi4uFx8zODMsNygtLisBCgoKBQUFDgUFDisZExkrKysrKysrKysrKysrKysrKysrKysrKysrKysrKysrKysrKysrKysrKysrKysrKysrKysrK//Z";

        String savedPath = service.storeImageFromDataUrl(dataUrl);

        assertThat(savedPath).startsWith("candidates_images/");
        assertThat(Files.exists(tempDirectory.resolve(savedPath.substring("candidates_images/".length())))).isTrue();
    }
}
