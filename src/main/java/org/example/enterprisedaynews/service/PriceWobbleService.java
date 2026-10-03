package org.example.enterprisedaynews.service;

import lombok.RequiredArgsConstructor;
import org.example.enterprisedaynews.dto.PriceWobbleRequest;
import org.example.enterprisedaynews.dto.PriceWobbleView;
import org.example.enterprisedaynews.model.PriceWobble;
import org.example.enterprisedaynews.repository.PriceWobbleRepository;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDateTime;
import java.time.OffsetDateTime;
import java.time.ZoneId;
import java.util.Optional;

/**
 * The "price wobble" (issue #41): staff make every price go up or down for a while. The price is locked in
 * when an advert is uploaded (stored as its totalCost), so a later wobble never changes what a team paid.
 */
@Service
@RequiredArgsConstructor
public class PriceWobbleService {

    /** From quarter price to triple price. */
    public static final int MIN_PERCENT = 25, MAX_PERCENT = 300;
    public static final int MAX_MESSAGE = 120;

    private final PriceWobbleRepository repository;

    /** The wobble set up by staff, in force now or starting later; empty at normal prices. */
    public Optional<PriceWobbleView> current() {
        LocalDateTime now = LocalDateTime.now();
        return repository.findById(PriceWobble.DEFAULT_ID)
                .filter(w -> w.getEndsAt() == null || now.isBefore(w.getEndsAt()))
                .map(w -> PriceWobbleView.of(w, now));
    }

    /** Prices as a percentage of normal right now (100 when there's no wobble). */
    public int currentPercent() {
        return current().filter(PriceWobbleView::activeNow).map(PriceWobbleView::percent).orElse(PriceList.FULL_PRICE);
    }

    /** The price list as students see it now, with the wobble (if any) applied and described. */
    public PriceList.Prices studentPrices() {
        return current().filter(PriceWobbleView::activeNow)
                .map(w -> PriceList.prices(w.percent(), w))
                .orElseGet(PriceList::prices);
    }

    @Transactional
    public PriceWobbleView set(PriceWobbleRequest request) {
        if (request.percent() < MIN_PERCENT || request.percent() > MAX_PERCENT) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "Prices can go from " + MIN_PERCENT + "% to " + MAX_PERCENT + "% of normal");
        }
        String message = request.message() == null || request.message().isBlank() ? null : request.message().trim();
        if (message != null && message.length() > MAX_MESSAGE) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "Keep the message under " + MAX_MESSAGE + " characters");
        }
        LocalDateTime now = LocalDateTime.now();
        LocalDateTime startsAt = local(request.startsAt());
        LocalDateTime endsAt = local(request.endsAt());
        if (endsAt != null && !endsAt.isAfter(startsAt == null ? now : startsAt)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "The end time must be after the start time (and in the future)");
        }
        PriceWobble saved = repository.save(new PriceWobble(PriceWobble.DEFAULT_ID, request.percent(), message,
                startsAt != null && startsAt.isAfter(now) ? startsAt : null, endsAt));
        return PriceWobbleView.of(saved, now);
    }

    /** Back to normal prices straight away (also part of resetting the event). */
    @Transactional
    public void stop() {
        repository.deleteById(PriceWobble.DEFAULT_ID);
    }

    private static LocalDateTime local(OffsetDateTime time) {
        return time == null ? null : time.atZoneSameInstant(ZoneId.systemDefault()).toLocalDateTime();
    }
}
