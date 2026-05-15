package org.example.enterprisedaynews.model;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDateTime;

@Entity
@Table(
        name = "student_accounts",
        uniqueConstraints = @UniqueConstraint(name = "uk_student_accounts_username", columnNames = "username")
)
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class StudentAccount {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, length = 100)
    private String username;

    @Column(nullable = false)
    private String passwordHash;

    @Column(nullable = false)
    private boolean locked;

    @Column(nullable = false)
    private int failedLoginAttempts;

    private LocalDateTime temporaryLockUntil;

    private LocalDateTime lastLoginAt;

    @Column(length = 255)
    private String lastLoginIp;

    @Column(nullable = false)
    private LocalDateTime createdAt;

    @Column(nullable = false)
    private LocalDateTime updatedAt;
}


