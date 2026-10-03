package org.example.enterprisedaynews.live;

/**
 * What changed (issue #43). Pages listening on {@code /api/events} reload just that data through the normal
 * API, which applies the usual access rules, so the events themselves carry nothing.
 */
public enum LiveTopic {
    /** Any advert or staff item: uploaded, approved, rejected, shown, hidden, reordered, deleted, FLASH. */
    ADVERTS("adverts"),
    /** Projector timing settings. */
    PROJECTOR_SETTINGS("projector-settings"),
    /** A price wobble started, changed or ended (#41). */
    PRICES("prices");

    private final String eventName;

    LiveTopic(String eventName) {
        this.eventName = eventName;
    }

    public String eventName() {
        return eventName;
    }

    /** Published by services when something changed; sent to listeners once the change is committed. */
    public record Changed(LiveTopic topic) {
    }
}
