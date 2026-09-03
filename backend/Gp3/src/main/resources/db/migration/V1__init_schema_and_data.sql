-- 1. Create candidates table
CREATE TABLE IF NOT EXISTS candidates (
    id BIGINT NOT NULL AUTO_INCREMENT,
    no INT,
    name VARCHAR(255) NOT NULL,
    gender VARCHAR(50),
    age INT,
    major VARCHAR(255),
    talent VARCHAR(255),
    bio TEXT,
    photo LONGTEXT,
    PRIMARY KEY (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 2. Create titles table
CREATE TABLE IF NOT EXISTS titles (
    id BIGINT NOT NULL AUTO_INCREMENT,
    name VARCHAR(255) NOT NULL,
    gender VARCHAR(50),
    PRIMARY KEY (id),
    CONSTRAINT uk_titles_name UNIQUE (name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 3. Create voter table
CREATE TABLE IF NOT EXISTS voter (
    id BIGINT NOT NULL AUTO_INCREMENT,
    username VARCHAR(255) NOT NULL,
    major VARCHAR(255) NOT NULL,
    phone_number VARCHAR(255) NOT NULL,
    telegram_chat_id VARCHAR(255),
    telegram_username VARCHAR(255),
    otp_hash VARCHAR(255),
    otp_expires_at TIMESTAMP NULL,
    verified BOOLEAN NOT NULL DEFAULT FALSE,
    has_voted BOOLEAN NOT NULL DEFAULT FALSE,
    PRIMARY KEY (id),
    CONSTRAINT uk_voter_phone UNIQUE (phone_number)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 4. Create voter_voted_titles table
CREATE TABLE IF NOT EXISTS voter_voted_titles (
    voter_id BIGINT NOT NULL,
    title_name VARCHAR(255) NOT NULL,
    PRIMARY KEY (voter_id, title_name),
    CONSTRAINT fk_voter_voted_titles_voter FOREIGN KEY (voter_id) REFERENCES voter(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 5. Create administrator and teacher-token tables before later migrations use them.
CREATE TABLE IF NOT EXISTS admins (
    id BIGINT NOT NULL AUTO_INCREMENT,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL,
    password VARCHAR(255) NOT NULL,
    PRIMARY KEY (id),
    CONSTRAINT uk_admins_email UNIQUE (email)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS teacher_vote_tokens (
    id BIGINT NOT NULL AUTO_INCREMENT,
    token VARCHAR(255) NOT NULL,
    created_at TIMESTAMP NOT NULL,
    expires_at TIMESTAMP NOT NULL,
    used BOOLEAN NOT NULL DEFAULT FALSE,
    active BOOLEAN NOT NULL DEFAULT TRUE,
    created_by VARCHAR(255),
    teacher_name VARCHAR(255),
    PRIMARY KEY (id),
    CONSTRAINT uk_teacher_vote_tokens_token UNIQUE (token)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 6. Create category/title physical candidate tables
CREATE TABLE IF NOT EXISTS king (
    candidate_id BIGINT NOT NULL,
    no INT NOT NULL,
    name VARCHAR(255) NOT NULL,
    votes INT NOT NULL DEFAULT 0,
    student_votes INT NOT NULL DEFAULT 0,
    teacher_votes INT NOT NULL DEFAULT 0,
    PRIMARY KEY (candidate_id),
    CONSTRAINT fk_king_candidate FOREIGN KEY (candidate_id) REFERENCES candidates(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS queen (
    candidate_id BIGINT NOT NULL,
    no INT NOT NULL,
    name VARCHAR(255) NOT NULL,
    votes INT NOT NULL DEFAULT 0,
    student_votes INT NOT NULL DEFAULT 0,
    teacher_votes INT NOT NULL DEFAULT 0,
    PRIMARY KEY (candidate_id),
    CONSTRAINT fk_queen_candidate FOREIGN KEY (candidate_id) REFERENCES candidates(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS style (
    candidate_id BIGINT NOT NULL,
    no INT NOT NULL,
    name VARCHAR(255) NOT NULL,
    votes INT NOT NULL DEFAULT 0,
    student_votes INT NOT NULL DEFAULT 0,
    teacher_votes INT NOT NULL DEFAULT 0,
    PRIMARY KEY (candidate_id),
    CONSTRAINT fk_style_candidate FOREIGN KEY (candidate_id) REFERENCES candidates(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS smart (
    candidate_id BIGINT NOT NULL,
    no INT NOT NULL,
    name VARCHAR(255) NOT NULL,
    votes INT NOT NULL DEFAULT 0,
    student_votes INT NOT NULL DEFAULT 0,
    teacher_votes INT NOT NULL DEFAULT 0,
    PRIMARY KEY (candidate_id),
    CONSTRAINT fk_smart_candidate FOREIGN KEY (candidate_id) REFERENCES candidates(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS mr_popular (
    candidate_id BIGINT NOT NULL,
    no INT NOT NULL,
    name VARCHAR(255) NOT NULL,
    votes INT NOT NULL DEFAULT 0,
    student_votes INT NOT NULL DEFAULT 0,
    teacher_votes INT NOT NULL DEFAULT 0,
    PRIMARY KEY (candidate_id),
    CONSTRAINT fk_mr_popular_candidate FOREIGN KEY (candidate_id) REFERENCES candidates(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS ms_popular (
    candidate_id BIGINT NOT NULL,
    no INT NOT NULL,
    name VARCHAR(255) NOT NULL,
    votes INT NOT NULL DEFAULT 0,
    student_votes INT NOT NULL DEFAULT 0,
    teacher_votes INT NOT NULL DEFAULT 0,
    PRIMARY KEY (candidate_id),
    CONSTRAINT fk_ms_popular_candidate FOREIGN KEY (candidate_id) REFERENCES candidates(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 6. Insert Initial Candidates
INSERT INTO candidates (id, no, name, gender, age, major, talent, bio, photo) VALUES
(1, 1, 'King', 'Male', 20, 'Computer Science', 'Singing', 'Warm and confident leader.', 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e'),
(2, 2, 'Queen', 'Female', 19, 'Business Admin', 'Dancing', 'Creative and kind-hearted student leader.', 'https://images.unsplash.com/photo-1494790108377-be9c29b29330'),
(3, 3, 'Style', 'Female', 21, 'Mass Communication', 'Fashion', 'Always elegant and full of flair.', 'https://images.unsplash.com/photo-1487412720507-e7ab37603c6f'),
(4, 4, 'Smart', 'Male', 22, 'Engineering', 'Public Speaking', 'Analytical and very disciplined.', 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d'),
(5, 5, 'Mr. Popular', 'Male', 20, 'Tourism', 'Comedy', 'Always social and loved by everyone.', 'https://images.unsplash.com/photo-1504593811423-6dd665756598'),
(6, 6, 'Ms. Popular', 'Female', 20, 'Psychology', 'Performing Arts', 'Energetic, friendly, and highly admired.', 'https://images.unsplash.com/photo-1544005313-94ddf0286df2');

-- 7. Insert Initial Titles
INSERT INTO titles (id, name, gender) VALUES
(1, 'King', 'Male'),
(2, 'Queen', 'Female'),
(3, 'Style', 'Female'),
(4, 'Smart', 'Male'),
(5, 'Mr. Popular', 'Male'),
(6, 'Ms. Popular', 'Female');

-- 8. Insert Initial Title Candidates
INSERT INTO king (candidate_id, no, name, votes, student_votes, teacher_votes) VALUES (1, 1, 'King', 0, 0, 0);
INSERT INTO queen (candidate_id, no, name, votes, student_votes, teacher_votes) VALUES (2, 2, 'Queen', 0, 0, 0);
INSERT INTO style (candidate_id, no, name, votes, student_votes, teacher_votes) VALUES (3, 3, 'Style', 0, 0, 0);
INSERT INTO smart (candidate_id, no, name, votes, student_votes, teacher_votes) VALUES (4, 4, 'Smart', 0, 0, 0);
INSERT INTO mr_popular (candidate_id, no, name, votes, student_votes, teacher_votes) VALUES (5, 5, 'Mr. Popular', 0, 0, 0);
INSERT INTO ms_popular (candidate_id, no, name, votes, student_votes, teacher_votes) VALUES (6, 6, 'Ms. Popular', 0, 0, 0);
