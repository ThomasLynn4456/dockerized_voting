package com.voting.Gp3.service;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.Base64;
import java.util.UUID;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

@Service
public class ImageStorageService {

    private final Path imageStorageDirectory;

    @Autowired
    public ImageStorageService(
            @Value("${app.candidate-images.directory:../../candidates_images}") String imageStorageDirectory) {
        this(findCandidateImagesDirectory(imageStorageDirectory));
    }

    private static Path findCandidateImagesDirectory(String configured) {
        Path configuredPath = Path.of(configured);
        if (configuredPath.isAbsolute()) {
            return configuredPath;
        }

        // Try configured relative path, or candidates_images in current dir, or ../candidates_images
        Path[] candidates = new Path[] {
            configuredPath,
            Path.of("candidates_images"),
            Path.of("../candidates_images"),
            Path.of("../../candidates_images"),
            Path.of("backend/Gp3/candidates_images")
        };

        for (Path p : candidates) {
            if (Files.exists(p) && Files.isDirectory(p)) {
                return p;
            }
        }
        return configuredPath;
    }

    public ImageStorageService(Path imageStorageDirectory) {
        this.imageStorageDirectory = imageStorageDirectory.toAbsolutePath().normalize();
        try {
            Files.createDirectories(this.imageStorageDirectory);
        } catch (IOException e) {
            throw new IllegalStateException("Unable to initialize image storage directory", e);
        }
    }

    public Path resolveImage(String filename) {
        Path imagePath = imageStorageDirectory.resolve(filename).normalize();
        return imagePath.startsWith(imageStorageDirectory) ? imagePath : null;
    }

    public String storeImageFromDataUrl(String dataUrl) {
        if (dataUrl == null || dataUrl.isBlank() || !dataUrl.startsWith("data:image/")) {
            return dataUrl;
        }

        String[] parts = dataUrl.split(",", 2);
        String metadata = parts[0];
        String imageData = parts.length > 1 ? parts[1] : "";

        String extension = ".jpg";
        if (metadata.contains("image/png")) {
            extension = ".png";
        } else if (metadata.contains("image/jpeg") || metadata.contains("image/jpg")) {
            extension = ".jpg";
        } else if (metadata.contains("image/gif")) {
            extension = ".gif";
        } else if (metadata.contains("image/webp")) {
            extension = ".webp";
        } else if (metadata.contains("image/bmp")) {
            extension = ".bmp";
        } else if (metadata.contains("image/svg+xml")) {
            extension = ".svg";
        }

        byte[] decodedBytes;
        try {
            decodedBytes = Base64.getDecoder().decode(imageData);
        } catch (IllegalArgumentException e) {
            throw new IllegalArgumentException("Image data is not valid Base64", e);
        }
        String uniqueFileName = UUID.randomUUID() + extension;
        Path targetPath = imageStorageDirectory.resolve(uniqueFileName);

        try {
            Files.write(targetPath, decodedBytes);
            return "candidates_images/" + uniqueFileName;
        } catch (IOException e) {
            throw new IllegalStateException("Failed to save image file", e);
        }
    }

    public void deleteImage(String imagePath) {
        if (imagePath == null || imagePath.isBlank() || imagePath.startsWith("http") || imagePath.startsWith("data:")) {
            return;
        }

        String normalizedPath = imagePath.trim().replace('\\', '/');
        String relativePath = normalizedPath
            .replaceFirst("^https?://[^/]+/", "")
            .replaceFirst("^/?(?:api/)?candidates_images/", "");
        Path filePath = imageStorageDirectory.resolve(relativePath).normalize();

        try {
            if (filePath.startsWith(imageStorageDirectory)) {
                Files.deleteIfExists(filePath);
            }
        } catch (IOException e) {
            throw new IllegalStateException("Failed to delete image file", e);
        }
    }
}
