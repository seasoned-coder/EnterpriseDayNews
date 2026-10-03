package org.example.enterprisedaynews.live;

import org.example.enterprisedaynews.TestAccounts;
import org.example.enterprisedaynews.dto.PriceWobbleRequest;
import org.example.enterprisedaynews.service.PriceWobbleService;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.context.ApplicationContext;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;

import static org.assertj.core.api.Assertions.assertThat;
import static org.awaitility.Awaitility.await;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.request;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.time.Duration;

/** Issue #43: pages are told the moment something changes. */
@SpringBootTest
@AutoConfigureMockMvc
class LiveUpdatesTests {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ApplicationContext context;

    @Autowired
    private LiveUpdates liveUpdates;

    @Autowired
    private PriceWobbleService priceWobbleService;

    @AfterEach
    void tearDown() {
        priceWobbleService.stop();
    }

    /** Opens the stream like a browser does (no sign-in) and returns it, still open. */
    private MvcResult listen() throws Exception {
        MvcResult stream = mockMvc.perform(get("/api/events").accept(MediaType.TEXT_EVENT_STREAM))
                .andExpect(status().isOk())
                .andExpect(request().asyncStarted())
                .andReturn();
        assertThat(stream.getResponse().getContentAsString()).contains("event:hello");
        return stream;
    }

    @Test
    void anyonesPageCanListenAndHearsWhenPricesChange() throws Exception {
        MvcResult stream = listen();

        priceWobbleService.set(new PriceWobbleRequest(200, "Rush!", null, null));

        await().atMost(Duration.ofSeconds(5)).untilAsserted(() ->
                assertThat(stream.getResponse().getContentAsString()).contains("event:prices"));
        // Only the topic: nothing about the change itself.
        assertThat(stream.getResponse().getContentAsString()).doesNotContain("Rush!").doesNotContain("200");
    }

    @Test
    void hearsWhenAdvertsChangeThroughTheApi() throws Exception {
        MvcResult stream = listen();
        String staff = TestAccounts.staffBearer(context, "live.staff");

        mockMvc.perform(post("/api/staff/info/free-text?flash=false").header("Authorization", staff)
                        .contentType(MediaType.TEXT_PLAIN).content("Lunch at 12:30"))
                .andExpect(status().isOk());

        await().atMost(Duration.ofSeconds(5)).untilAsserted(() ->
                assertThat(stream.getResponse().getContentAsString()).contains("event:adverts"));
    }

    @Test
    void burstsOfChangesAreSentOnce() throws Exception {
        MvcResult stream = listen();

        for (int i = 0; i < 10; i++) {
            liveUpdates.onChanged(new LiveTopic.Changed(LiveTopic.PROJECTOR_SETTINGS));
        }

        await().atMost(Duration.ofSeconds(5)).untilAsserted(() ->
                assertThat(stream.getResponse().getContentAsString()).contains("event:projector-settings"));
        Thread.sleep(LiveUpdates.COALESCE.toMillis() * 2);
        String body = stream.getResponse().getContentAsString();
        assertThat(body.split("event:projector-settings", -1)).hasSize(2); // exactly once
    }

    @Test
    void keepsQuietConnectionsAlive() throws Exception {
        MvcResult stream = listen();
        assertThat(liveUpdates.listenerCount()).isPositive();

        liveUpdates.heartbeat();

        assertThat(stream.getResponse().getContentAsString()).contains("event:ping");
    }
}
