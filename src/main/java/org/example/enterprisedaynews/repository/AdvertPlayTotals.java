package org.example.enterprisedaynews.repository;

/** One advert's screen time on the projector: how many showings, and seconds in all (issue #40). */
public record AdvertPlayTotals(Long imageId, Long plays, Long seconds) {
}
