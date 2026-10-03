package org.example.enterprisedaynews.model;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
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
 * One showing of a student advert on the projector (issue #40). {@code team} is copied from the advert, so
 * the team's screen time still counts if they later delete the advert.
 */
@Entity
@Table(name = "advert_plays")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class AdvertPlay {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private Long imageId;

    @Column(nullable = false)
    private String team;

    @Column(nullable = false)
    private LocalDateTime playedAt;

    @Column(nullable = false)
    private int seconds;
}
