package org.example.enterprisedaynews.service;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.Timeout;

import static org.assertj.core.api.Assertions.assertThat;

class EventDetailsServiceTests {

    @Test
    void trimsTrailingSlashes() {
        assertThat(EventDetailsService.withoutTrailingSlashes("http://192.168.1.10/")).isEqualTo("http://192.168.1.10");
        assertThat(EventDetailsService.withoutTrailingSlashes("http://192.168.1.10///")).isEqualTo("http://192.168.1.10");
        assertThat(EventDetailsService.withoutTrailingSlashes("http://x/app")).isEqualTo("http://x/app");
        assertThat(EventDetailsService.withoutTrailingSlashes("///")).isEmpty();
        assertThat(EventDetailsService.withoutTrailingSlashes("")).isEmpty();
    }

    /** Code scanning (java/polynomial-redos): a long run of slashes must stay fast. */
    @Test
    @Timeout(1)
    void staysFastOnLongRunsOfSlashes() {
        String slashes = "/".repeat(1_000_000) + "x";
        assertThat(EventDetailsService.withoutTrailingSlashes(slashes)).isEqualTo(slashes);
        assertThat(EventDetailsService.withoutTrailingSlashes("x" + "/".repeat(1_000_000))).isEqualTo("x");
    }
}
