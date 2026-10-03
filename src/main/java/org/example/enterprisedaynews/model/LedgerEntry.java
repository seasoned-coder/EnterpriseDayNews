package org.example.enterprisedaynews.model;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDateTime;

/**
 * One line in a team's account (issue #48): a charge, a credit or a payment, in event money. Amounts are
 * always positive; {@link Kind} says which way they go.
 */
@Entity
@Table(name = "team_ledger")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class LedgerEntry {

    public enum Kind {
        /** An advert was approved: the team owes its price. */
        CHARGE,
        /** An approved advert was later rejected: its price is given back. */
        CREDIT,
        /** Staff took the whole balance from the team's bank. */
        PAYMENT
    }

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String team;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private Kind kind;

    @Column(nullable = false)
    private int amount;

    /** The advert it's for (charges and credits). May no longer exist. */
    private Long imageId;

    /** What it was for, kept even if the advert is deleted, e.g. "advert.png (priority 4, 30 s)". */
    private String description;

    @Column(nullable = false)
    private LocalDateTime createdAt;

    /** The staff member who approved, rejected or marked it paid. */
    private String recordedBy;

    /** What it does to the balance owed. */
    public int signedAmount() {
        return kind == Kind.CHARGE ? amount : -amount;
    }
}
