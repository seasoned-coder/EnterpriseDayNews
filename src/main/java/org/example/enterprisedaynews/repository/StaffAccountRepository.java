package org.example.enterprisedaynews.repository;

import org.example.enterprisedaynews.model.StaffAccount;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface StaffAccountRepository extends JpaRepository<StaffAccount, Long> {
    Optional<StaffAccount> findByUsername(String username);
    boolean existsByUsername(String username);
}
