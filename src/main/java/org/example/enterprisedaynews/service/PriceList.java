package org.example.enterprisedaynews.service;

import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;

/**
 * What students pay (in event money) for an advert: the single source of truth (issue #35). The student
 * page gets these from the API rather than keeping its own copy.
 */
public final class PriceList {

    /** One choice a student can make and what it costs. */
    public record Option(int value, int cost) {
    }

    /** Everything the student page needs to show the choices and the total. */
    public record Prices(List<Option> priority, List<Option> durationSeconds) {
    }

    /** Priority 1-4: how many times per rotation the advert appears. */
    public static final List<Option> PRIORITY = List.of(
            new Option(1, 5), new Option(2, 10), new Option(3, 15), new Option(4, 20));

    /** How long each appearance lasts. */
    public static final List<Option> DURATION_SECONDS = List.of(
            new Option(10, 5), new Option(20, 10), new Option(30, 15));

    private PriceList() {
    }

    public static Prices prices() {
        return new Prices(PRIORITY, DURATION_SECONDS);
    }

    /** Total cost of an advert; refuses anything that isn't on the price list. */
    public static int totalCost(int priority, int durationSeconds) {
        return costOf(PRIORITY, priority, "Priority must be one of " + values(PRIORITY))
                + costOf(DURATION_SECONDS, durationSeconds, "Duration must be one of " + values(DURATION_SECONDS) + " seconds");
    }

    private static int costOf(List<Option> options, int value, String error) {
        return options.stream()
                .filter(option -> option.value() == value)
                .mapToInt(Option::cost)
                .findFirst()
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.BAD_REQUEST, error));
    }

    private static String values(List<Option> options) {
        return options.stream().map(option -> String.valueOf(option.value())).toList().toString();
    }
}
