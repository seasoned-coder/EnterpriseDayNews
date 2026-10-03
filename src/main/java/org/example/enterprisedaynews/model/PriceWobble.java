package org.example.enterprisedaynews.model;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDateTime;

/**
 * A "price wobble" (issue #41): for a while, every price is {@code percent} of normal, e.g. 200 for a
 * lunchtime rush or 50 for a quiet-time sale. At most one; no row means normal prices.
 */
@Entity
@Table(name = "price_wobble")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class PriceWobble {

    public static final String DEFAULT_ID = "DEFAULT";

    @Id
    @Builder.Default
    private String id = DEFAULT_ID;

    @Column(nullable = false)
    private int percent;

    /** Shown to students, e.g. "Lunchtime rush!". */
    @Column(length = 120)
    private String message;

    /** Null: straight away. */
    private LocalDateTime startsAt;

    /** Null: until staff end it. */
    private LocalDateTime endsAt;

    public boolean isActiveAt(LocalDateTime time) {
        return (startsAt == null || !time.isBefore(startsAt)) && (endsAt == null || time.isBefore(endsAt));
    }
}
