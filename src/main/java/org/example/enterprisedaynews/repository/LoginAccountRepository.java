package org.example.enterprisedaynews.repository;

import org.example.enterprisedaynews.model.LoginAccount;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.repository.NoRepositoryBean;

import java.util.List;
import java.util.Optional;

/** Queries shared by every kind of sign-in account (students, staff). */
@NoRepositoryBean
public interface LoginAccountRepository<T extends LoginAccount> extends JpaRepository<T, Long> {
    Optional<T> findByUsername(String username);
    boolean existsByUsername(String username);
    List<T> findAllByOrderByUsernameAsc();
}
