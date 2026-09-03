CREATE TABLE IF NOT EXISTS published_title_results (
    id BIGINT NOT NULL AUTO_INCREMENT,
    title_id BIGINT NOT NULL,
    candidate_id BIGINT NOT NULL,
    student_weight INT NOT NULL,
    teacher_weight INT NOT NULL,
    published_at TIMESTAMP NOT NULL,
    PRIMARY KEY (id),
    CONSTRAINT uk_published_title_results_title UNIQUE (title_id),
    CONSTRAINT fk_published_title_results_title FOREIGN KEY (title_id) REFERENCES titles(id) ON DELETE CASCADE,
    CONSTRAINT fk_published_title_results_candidate FOREIGN KEY (candidate_id) REFERENCES candidates(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
