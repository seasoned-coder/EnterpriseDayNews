package org.example.enterprisedaynews.repository;

/** A team's screen time on the projector: how many showings, and seconds in all (issue #40). */
public record TeamPlayTotals(String team, Long plays, Long seconds) {
}
