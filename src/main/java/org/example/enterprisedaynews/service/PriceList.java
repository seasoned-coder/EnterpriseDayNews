package org.example.enterprisedaynews.service;

import org.example.enterprisedaynews.dto.PriceWobbleView;
import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;

/**
 * What students pay (in event money) for an advert: the single source of truth (issue #35). The student
 * page gets these from the API rather than keeping its own copy. Staff can make prices "wobble" up or down
 * for a while (#41): every cost is then scaled by a percentage.
 */
public final class PriceList {

    /** One choice a student can make and what it costs. */
    public record Option(int value, int cost) {
    }

    /**
     * Everything the student page needs to show the choices and the total.
     *
     * @param wobble the price wobble in force (#41), or null at normal prices
     */
    public record Prices(List<Option> priority, List<Option> durationSeconds, PriceWobbleView wobble) {
    }

    /** Priority 1-4: how many times per rotation the advert appears. */
    public static final List<Option> PRIORITY = List.of(
            new Option(1, 5), new Option(2, 10), new Option(3, 15), new Option(4, 20));

    /** How long each appearance lasts. */
    public static final List<Option> DURATION_SECONDS = List.of(
            new Option(10, 5), new Option(20, 10), new Option(30, 15));

    /** Normal prices. */
    public static final int FULL_PRICE = 100;

    private PriceList() {
    }

    public static Prices prices() {
        return new Prices(PRIORITY, DURATION_SECONDS, null);
    }

    /** The price list with every cost scaled to {@code percent} of normal (#41). */
    public static Prices prices(int percent, PriceWobbleView wobble) {
        return new Prices(scaled(PRIORITY, percent), scaled(DURATION_SECONDS, percent), wobble);
    }

    /** Total cost of an advert at normal prices; refuses anything that isn't on the price list. */
    public static int totalCost(int priority, int durationSeconds) {
        return totalCost(priority, durationSeconds, FULL_PRICE);
    }

    /**
     * Total cost at {@code percent} of normal prices. Each part is scaled and rounded on its own, so the
     * total always equals the two prices the student sees added together.
     */
    public static int totalCost(int priority, int durationSeconds, int percent) {
        return scale(costOf(PRIORITY, priority, "Priority must be one of " + values(PRIORITY)), percent)
                + scale(costOf(DURATION_SECONDS, durationSeconds,
                        "Duration must be one of " + values(DURATION_SECONDS) + " seconds"), percent);
    }

    /** A cost at {@code percent} of normal, rounded, and never free. */
    static int scale(int cost, int percent) {
        return Math.max(1, (int) Math.round(cost * percent / 100.0));
    }

    private static List<Option> scaled(List<Option> options, int percent) {
        return options.stream().map(o -> new Option(o.value(), scale(o.cost(), percent))).toList();
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
