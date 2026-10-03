package org.example.enterprisedaynews;

import org.example.enterprisedaynews.service.PriceList;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;

import static org.junit.jupiter.api.Assertions.*;

/** Issue #35: one price list for advert priority and duration. */
class PriceListTests {

    @Test
    void totalIsPriorityPlusDurationCost() {
        assertEquals(5 + 5, PriceList.totalCost(1, 10));
        assertEquals(10 + 10, PriceList.totalCost(2, 20));
        assertEquals(20 + 15, PriceList.totalCost(4, 30));
    }

    @Test
    void refusesChoicesThatAreNotOnTheList() {
        for (int[] bad : new int[][]{{0, 10}, {5, 10}, {99, 10}, {1, 0}, {1, 15}, {1, 300}}) {
            ResponseStatusException ex = assertThrows(ResponseStatusException.class,
                    () -> PriceList.totalCost(bad[0], bad[1]), "priority " + bad[0] + ", duration " + bad[1]);
            assertEquals(HttpStatus.BAD_REQUEST, ex.getStatusCode());
        }
    }

    @Test
    void explainsWhatIsAllowed() {
        assertEquals("Priority must be one of [1, 2, 3, 4]", assertThrows(ResponseStatusException.class,
                () -> PriceList.totalCost(9, 10)).getReason());
        assertEquals("Duration must be one of [10, 20, 30] seconds", assertThrows(ResponseStatusException.class,
                () -> PriceList.totalCost(1, 45)).getReason());
    }

    @Test
    void servesTheSameListItUses() {
        PriceList.Prices prices = PriceList.prices();
        assertEquals(PriceList.PRIORITY, prices.priority());
        assertEquals(PriceList.DURATION_SECONDS, prices.durationSeconds());
    }
}
