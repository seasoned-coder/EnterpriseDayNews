package org.example.enterprisedaynews;

import org.example.enterprisedaynews.dto.PriceWobbleRequest;
import org.example.enterprisedaynews.dto.PriceWobbleView;
import org.example.enterprisedaynews.service.PriceList;
import org.example.enterprisedaynews.service.PriceWobbleService;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.context.ApplicationContext;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.web.server.ResponseStatusException;

import java.time.OffsetDateTime;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/** Issue #41: staff make prices go up or down for a while. */
@SpringBootTest
@AutoConfigureMockMvc
class PriceWobbleTests {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ApplicationContext context;

    @Autowired
    private PriceWobbleService priceWobbleService;

    private String staff;
    private String student;

    @BeforeEach
    void setUp() {
        staff = TestAccounts.staffBearer(context, "wobble.staff");
        student = TestAccounts.studentBearer(context, "wobble-team");
    }

    @AfterEach
    void backToNormal() {
        priceWobbleService.stop();
    }

    private static PriceWobbleRequest wobble(int percent, OffsetDateTime startsAt, OffsetDateTime endsAt) {
        return new PriceWobbleRequest(percent, "Lunchtime rush!", startsAt, endsAt);
    }

    @Test
    void normalPricesWhenThereIsNoWobble() throws Exception {
        assertThat(priceWobbleService.currentPercent()).isEqualTo(100);
        mockMvc.perform(get("/api/staff/price-wobble").header("Authorization", staff))
                .andExpect(status().isNoContent());
        mockMvc.perform(get("/api/student/prices").header("Authorization", student))
                .andExpect(jsonPath("$.priority[3].cost").value(20))
                .andExpect(jsonPath("$.wobble").doesNotExist());
    }

    @Test
    void aWobbleChangesWhatStudentsSeeAndPay() throws Exception {
        mockMvc.perform(put("/api/staff/price-wobble").header("Authorization", staff)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"percent\":200,\"message\":\" Lunchtime rush! \"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.activeNow").value(true))
                .andExpect(jsonPath("$.message").value("Lunchtime rush!"));

        mockMvc.perform(get("/api/student/prices").header("Authorization", student))
                .andExpect(jsonPath("$.priority[3].cost").value(40))
                .andExpect(jsonPath("$.durationSeconds[2].cost").value(30))
                .andExpect(jsonPath("$.wobble.percent").value(200))
                .andExpect(jsonPath("$.wobble.message").value("Lunchtime rush!"));
        assertThat(priceWobbleService.currentPercent()).isEqualTo(200);

        mockMvc.perform(delete("/api/staff/price-wobble").header("Authorization", staff))
                .andExpect(status().isNoContent());
        assertThat(priceWobbleService.currentPercent()).isEqualTo(100);
    }

    @Test
    void aScheduledWobbleOnlyAppliesOnceItStarts() {
        PriceWobbleView later = priceWobbleService.set(wobble(50, OffsetDateTime.now().plusHours(1), null));

        assertThat(later.activeNow()).isFalse();
        assertThat(later.startsAt()).isNotNull();
        assertThat(priceWobbleService.currentPercent()).isEqualTo(100);
        assertThat(priceWobbleService.studentPrices().wobble()).isNull();
        assertThat(priceWobbleService.current()).isPresent(); // staff still see what's coming
    }

    @Test
    void pricesGoBackToNormalWhenTheWobbleEnds() throws InterruptedException {
        priceWobbleService.set(wobble(150, null, OffsetDateTime.now().plusSeconds(1)));
        assertThat(priceWobbleService.currentPercent()).isEqualTo(150);

        Thread.sleep(1500);

        assertThat(priceWobbleService.currentPercent()).isEqualTo(100);
        assertThat(priceWobbleService.current()).isEmpty();
    }

    @Test
    void refusesSillyWobbles() {
        assertThatThrownBy(() -> priceWobbleService.set(wobble(10, null, null)))
                .isInstanceOf(ResponseStatusException.class).hasMessageContaining("25% to 300%");
        assertThatThrownBy(() -> priceWobbleService.set(wobble(400, null, null)))
                .isInstanceOf(ResponseStatusException.class);
        assertThatThrownBy(() -> priceWobbleService.set(wobble(150, null, OffsetDateTime.now().minusMinutes(1))))
                .isInstanceOf(ResponseStatusException.class).hasMessageContaining("end time");
        assertThatThrownBy(() -> priceWobbleService.set(new PriceWobbleRequest(150, "x".repeat(121), null, null)))
                .isInstanceOf(ResponseStatusException.class).hasMessageContaining("120");
    }

    @Test
    void staffCanPreviewPricesAtAnyPercent() throws Exception {
        mockMvc.perform(get("/api/staff/prices?percent=50").header("Authorization", staff))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.priority[0].cost").value(3)) // 5 at half price rounds to 3
                .andExpect(jsonPath("$.priority[3].cost").value(10));
        mockMvc.perform(get("/api/staff/prices?percent=1000").header("Authorization", staff))
                .andExpect(status().isBadRequest());
    }

    @Test
    void studentsCantChangePrices() throws Exception {
        mockMvc.perform(put("/api/staff/price-wobble").header("Authorization", student)
                        .contentType(MediaType.APPLICATION_JSON).content("{\"percent\":25}"))
                .andExpect(status().isForbidden());
        assertThat(PriceList.FULL_PRICE).isEqualTo(priceWobbleService.currentPercent());
    }
}
