package org.example.enterprisedaynews.repository;

/** How many adverts a team has uploaded (still in the system), and how many of those are approved (issue #48). */
public record TeamAdvertCounts(String team, Long uploaded, Long approved) {
}
