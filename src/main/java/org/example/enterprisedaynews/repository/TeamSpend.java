package org.example.enterprisedaynews.repository;

/** A team's approved adverts and what they cost, in event money (issue #40). */
public record TeamSpend(String team, Long adverts, Long spent) {
}
