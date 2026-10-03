package org.example.enterprisedaynews.repository;

import org.example.enterprisedaynews.model.AppSecret;
import org.springframework.data.jpa.repository.JpaRepository;

public interface AppSecretRepository extends JpaRepository<AppSecret, String> {
}
