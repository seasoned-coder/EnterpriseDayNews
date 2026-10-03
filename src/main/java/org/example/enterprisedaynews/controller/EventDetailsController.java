package org.example.enterprisedaynews.controller;

import lombok.RequiredArgsConstructor;
import org.example.enterprisedaynews.model.EventDetails;
import org.example.enterprisedaynews.service.EventDetailsService;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/** Wi-Fi and address details for team login slips (issue #37). Staff-only (SecurityConfig: /api/staff/**). */
@RestController
@RequestMapping("/api/staff/event-details")
@RequiredArgsConstructor
public class EventDetailsController {

    private final EventDetailsService eventDetailsService;

    @GetMapping
    public EventDetails get() {
        return eventDetailsService.get();
    }

    @PutMapping
    public EventDetails update(@RequestBody EventDetails details) {
        return eventDetailsService.update(details);
    }
}
