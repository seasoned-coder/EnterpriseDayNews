package org.example.enterprisedaynews.controller;

import lombok.RequiredArgsConstructor;
import org.example.enterprisedaynews.dto.EventResults;
import org.example.enterprisedaynews.dto.StudentResults;
import org.example.enterprisedaynews.security.JwtProvider;
import org.example.enterprisedaynews.security.Roles;
import org.example.enterprisedaynews.service.ResultsService;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.security.Principal;
import java.time.Duration;
import java.util.Map;

/** Screen time and results (issue #40). Staff-only and student-only by path (SecurityConfig). */
@RestController
@RequestMapping("/api")
@RequiredArgsConstructor
public class ResultsController {

    /** How long a projector key works: comfortably more than an event, with set-up the day before. */
    static final Duration PROJECTOR_KEY_VALIDITY = Duration.ofDays(7);

    private final ResultsService resultsService;
    private final JwtProvider jwtProvider;

    /** The leaderboard: every team's spend and screen time. */
    @GetMapping("/staff/results")
    public EventResults eventResults() {
        return resultsService.eventResults();
    }

    /**
     * A key for the projector, so it can record what it shows. Only works while the staff member who asked
     * for it has an active account. The staff app opens the projector with it.
     */
    @PostMapping("/staff/projector-key")
    public Map<String, String> projectorKey(Principal principal) {
        return Map.of("key", jwtProvider.generateToken(
                ControllerSupport.usernameOf(principal), Roles.PROJECTOR, PROJECTOR_KEY_VALIDITY));
    }

    /** The signed-in team's own results. */
    @GetMapping("/student/results")
    public StudentResults studentResults(Principal principal) {
        return resultsService.studentResults(ControllerSupport.usernameOf(principal));
    }
}
