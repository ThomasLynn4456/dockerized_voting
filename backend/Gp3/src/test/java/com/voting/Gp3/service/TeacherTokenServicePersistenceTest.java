package com.voting.Gp3.service;

import static org.assertj.core.api.Assertions.assertThat;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;

import com.voting.Gp3.entity.TeacherVoteToken;

@SpringBootTest
class TeacherTokenServicePersistenceTest {

    @Autowired
    private TeacherVoteTokenService teacherVoteTokenService;

    @Test
    void shouldPersistGeneratedTeacherTokenAndAllowDeletion() {
        TeacherVoteToken token = teacherVoteTokenService.createToken("Prof. Smith");

        assertThat(token).isNotNull();
        assertThat(token.getId()).isNotNull();
        assertThat(token.getToken()).isNotBlank();
        assertThat(teacherVoteTokenService.findByToken(token.getToken())).isPresent();

        teacherVoteTokenService.deleteToken(token.getId());

        assertThat(teacherVoteTokenService.findByToken(token.getToken())).isEmpty();
    }
}
