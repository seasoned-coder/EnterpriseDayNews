package org.example.enterprisedaynews.model;

import jakarta.persistence.Entity;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;
import lombok.NoArgsConstructor;
import lombok.experimental.SuperBuilder;

@Entity
@Table(
        name = "staff_accounts",
        uniqueConstraints = @UniqueConstraint(name = "uk_staff_accounts_username", columnNames = "username")
)
@NoArgsConstructor
@SuperBuilder
public class StaffAccount extends LoginAccount {
}
