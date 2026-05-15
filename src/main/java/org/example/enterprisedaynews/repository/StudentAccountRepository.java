package org.example.enterprisedaynews.repository;

import org.example.enterprisedaynews.model.StudentAccount;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface StudentAccountRepository extends JpaRepository<StudentAccount, Long> {
    Optional<StudentAccount> findByUsername(String username);
    boolean existsByUsername(String username);
    List<StudentAccount> findAllByOrderByUsernameAsc();
}

