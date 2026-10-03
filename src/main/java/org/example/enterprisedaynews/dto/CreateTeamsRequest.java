package org.example.enterprisedaynews.dto;

import java.util.List;

/** The team usernames to create in one go (issue #37). The page builds them from a pattern or a pasted list. */
public record CreateTeamsRequest(List<String> usernames) {
}
