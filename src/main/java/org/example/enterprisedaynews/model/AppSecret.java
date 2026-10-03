package org.example.enterprisedaynews.model;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

/** A secret the application generated for itself (e.g. the JWT signing key when none is configured). */
@Entity
@Table(name = "app_secrets")
@Getter
@NoArgsConstructor
@AllArgsConstructor
public class AppSecret {

    @Id
    @Column(length = 100)
    private String name;

    @Column(name = "secret_value", nullable = false, length = 255)
    private String value;

    @Column(nullable = false)
    private LocalDateTime createdAt;
}
