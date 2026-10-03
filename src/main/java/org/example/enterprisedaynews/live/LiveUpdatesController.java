package org.example.enterprisedaynews.live;

import lombok.RequiredArgsConstructor;
import org.springframework.http.MediaType;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

/** The live-updates stream (issue #43). Public: events say only which kind of data changed. */
@RestController
@RequiredArgsConstructor
public class LiveUpdatesController {

    private final LiveUpdates liveUpdates;

    @GetMapping(path = "/api/events", produces = MediaType.TEXT_EVENT_STREAM_VALUE)
    public SseEmitter events() {
        return liveUpdates.subscribe();
    }
}
