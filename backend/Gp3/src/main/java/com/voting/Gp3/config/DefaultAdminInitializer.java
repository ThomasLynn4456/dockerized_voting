package com.voting.Gp3.config;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

import com.voting.Gp3.Admin;
import com.voting.Gp3.repository.AdminRepository;

@Component
public class DefaultAdminInitializer implements ApplicationRunner {

    private static final Logger log = LoggerFactory.getLogger(DefaultAdminInitializer.class);

    private final AdminRepository adminRepository;
    private final PasswordEncoder passwordEncoder;
    private final String name;
    private final String email;
    private final String password;

    public DefaultAdminInitializer(
            AdminRepository adminRepository,
            PasswordEncoder passwordEncoder,
            @Value("${app.default-admin.name:}") String name,
            @Value("${app.default-admin.email:}") String email,
            @Value("${app.default-admin.password:}") String password) {
        this.adminRepository = adminRepository;
        this.passwordEncoder = passwordEncoder;
        this.name = name;
        this.email = email;
        this.password = password;
    }

    @Override
    public void run(ApplicationArguments args) {
        if (email.isBlank() || password.isBlank()) {
            return;
        }

        Admin admin = adminRepository.findByEmail(email).orElseGet(() -> {
            var existingAdmins = adminRepository.findAll();
            return existingAdmins.size() == 1 ? existingAdmins.get(0) : new Admin();
        });

        boolean newAdmin = admin.getId() == null;
        admin.setName(name.isBlank() ? "Administrator" : name);
        admin.setEmail(email);
        if (newAdmin || admin.getPassword() == null || !passwordEncoder.matches(password, admin.getPassword())) {
            admin.setPassword(passwordEncoder.encode(password));
        }

        adminRepository.save(admin);
        log.info("Synchronized the configured administrator account.");
    }
}
