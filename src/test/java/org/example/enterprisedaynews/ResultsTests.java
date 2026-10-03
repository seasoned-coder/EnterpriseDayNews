package org.example.enterprisedaynews;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.example.enterprisedaynews.dto.EventResults;
import org.example.enterprisedaynews.dto.PlayReport;
import org.example.enterprisedaynews.dto.StudentResults;
import org.example.enterprisedaynews.dto.TeamResult;
import org.example.enterprisedaynews.model.ImageMetadata;
import org.example.enterprisedaynews.model.ImageMetadata.ApprovalStatus;
import org.example.enterprisedaynews.repository.AdvertPlayRepository;
import org.example.enterprisedaynews.repository.ImageRepository;
import org.example.enterprisedaynews.repository.StaffAccountRepository;
import org.example.enterprisedaynews.repository.StudentAccountRepository;
import org.example.enterprisedaynews.service.ResultsService;
import org.example.enterprisedaynews.service.StaffAccountService;
import org.example.enterprisedaynews.service.StudentAccountService;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.context.ApplicationContext;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;

import java.time.LocalDateTime;
import java.time.OffsetDateTime;
import java.util.ArrayList;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.groups.Tuple.tuple;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/** Issue #40: the projector records what it shows; teams and staff see the results. */
@SpringBootTest
@AutoConfigureMockMvc
class ResultsTests {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ApplicationContext context;

    @Autowired
    private ObjectMapper objectMapper;

    @Autowired
    private ResultsService resultsService;

    @Autowired
    private ImageRepository imageRepository;

    @Autowired
    private AdvertPlayRepository playRepository;

    @Autowired
    private StudentAccountService studentAccountService;

    @Autowired
    private StudentAccountRepository studentAccountRepository;

    @Autowired
    private StaffAccountService staffAccountService;

    @Autowired
    private StaffAccountRepository staffAccountRepository;

    private final List<ImageMetadata> created = new ArrayList<>();
    private String staff;

    @BeforeEach
    void setUp() {
        staff = TestAccounts.staffBearer(context, "results.staff");
    }

    @AfterEach
    void cleanUp() {
        playRepository.deleteAll();
        imageRepository.deleteAll(created);
        created.clear();
    }

    private ImageMetadata advert(String team, ApprovalStatus status, int cost, boolean info) {
        ImageMetadata saved = imageRepository.save(ImageMetadata.builder()
                .uploadedBy(team)
                .uploadedAt(LocalDateTime.now())
                .status(status)
                .display(status == ApprovalStatus.APPROVED)
                .isInfoMessage(info)
                .messageText(info ? "notice" : null)
                .priority(1)
                .durationSeconds(10)
                .totalCost(cost)
                .build());
        created.add(saved);
        return saved;
    }

    private static PlayReport shown(ImageMetadata advert, int seconds) {
        return new PlayReport(advert.getId(), seconds, OffsetDateTime.now());
    }

    private TeamResult resultFor(EventResults results, String team) {
        return results.teams().stream().filter(t -> t.team().equals(team)).findFirst().orElseThrow();
    }

    @Test
    void recordsOnlySensibleShowingsOfStudentAdverts() {
        ImageMetadata advert = advert("res-rocket", ApprovalStatus.APPROVED, 25, false);
        ImageMetadata notice = advert("res-staff", ApprovalStatus.APPROVED, 0, true);

        int recorded = resultsService.recordPlays(List.of(
                shown(advert, 20),
                shown(advert, 300),                                        // too long: counted as the longest (30s)
                shown(advert, 0),                                          // nothing shown
                shown(notice, 10),                                         // staff item, not a team's advert
                new PlayReport(999_999L, 10, OffsetDateTime.now()),        // no such advert
                new PlayReport(advert.getId(), 10, OffsetDateTime.now().plusHours(1)),  // in the future
                new PlayReport(advert.getId(), 10, OffsetDateTime.now().minusDays(2)),  // far too old
                new PlayReport(advert.getId(), 10, null)));                // no time: now

        assertThat(recorded).isEqualTo(3);
        TeamResult rocket = resultFor(resultsService.eventResults(), "res-rocket");
        assertThat(rocket.plays()).isEqualTo(3);
        assertThat(rocket.seconds()).isEqualTo(20 + 30 + 10);
    }

    @Test
    void leaderboardShowsSpendOnApprovedAdvertsScreenTimeAndValue() {
        ImageMetadata lemonade = advert("res-lemonade", ApprovalStatus.APPROVED, 30, false);
        advert("res-lemonade", ApprovalStatus.REJECTED, 20, false);   // rejected: not spent
        ImageMetadata pixels = advert("res-pixels", ApprovalStatus.APPROVED, 10, false);
        advert("res-quiet", ApprovalStatus.NEW, 15, false);           // uploaded, nothing shown yet
        resultsService.recordPlays(List.of(shown(lemonade, 30), shown(lemonade, 30), shown(pixels, 30)));

        EventResults results = resultsService.eventResults();

        TeamResult lemonadeResult = resultFor(results, "res-lemonade");
        assertThat(lemonadeResult.spent()).isEqualTo(30);
        assertThat(lemonadeResult.adverts()).isEqualTo(1);
        assertThat(lemonadeResult.seconds()).isEqualTo(60);
        assertThat(lemonadeResult.costPerMinute()).isEqualTo(30.0);
        assertThat(resultFor(results, "res-pixels").costPerMinute()).isEqualTo(20.0);
        TeamResult quiet = resultFor(results, "res-quiet");
        assertThat(quiet.seconds()).isZero();
        assertThat(quiet.costPerMinute()).isNull();
        // Most screen time first.
        List<String> order = results.teams().stream().map(TeamResult::team)
                .filter(t -> t.startsWith("res-")).toList();
        assertThat(order).containsSubsequence("res-lemonade", "res-pixels", "res-quiet");
        assertThat(results.lastPlayAt()).isNotNull();
    }

    @Test
    void aTeamSeesItsOwnTotalsAndEachAdvertsScreenTime() throws Exception {
        String team = TestAccounts.studentBearer(context, "res-own");
        ImageMetadata first = advert("res-own", ApprovalStatus.APPROVED, 20, false);
        ImageMetadata second = advert("res-own", ApprovalStatus.APPROVED, 10, false);
        resultsService.recordPlays(List.of(shown(first, 20), shown(first, 20), shown(second, 10)));

        StudentResults results = resultsService.studentResults("res-own");
        assertThat(results.team().spent()).isEqualTo(30);
        assertThat(results.team().seconds()).isEqualTo(50);
        assertThat(results.adverts()).extracting(StudentResults.AdvertResult::imageId, StudentResults.AdvertResult::seconds)
                .containsExactlyInAnyOrder(
                        tuple(first.getId(), 40L),
                        tuple(second.getId(), 10L));

        mockMvc.perform(get("/api/student/results").header("Authorization", team))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.team.plays").value(3));
    }

    @Test
    void onlyAProjectorWithAKeyFromStaffCanRecordShowings() throws Exception {
        ImageMetadata advert = advert("res-keyed", ApprovalStatus.APPROVED, 10, false);
        String body = objectMapper.writeValueAsString(List.of(shown(advert, 10)));

        String key = objectMapper.readTree(mockMvc.perform(post("/api/staff/projector-key").header("Authorization", staff))
                .andExpect(status().isOk()).andReturn().getResponse().getContentAsString()).get("key").asText();

        mockMvc.perform(post("/api/projector/plays").header("Authorization", "Bearer " + key)
                        .contentType(MediaType.APPLICATION_JSON).content(body))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.recorded").value(1));

        // Anyone else on the Wi-Fi: no key, a student's sign-in, even a staff sign-in.
        mockMvc.perform(post("/api/projector/plays").contentType(MediaType.APPLICATION_JSON).content(body))
                .andExpect(status().isUnauthorized());
        mockMvc.perform(post("/api/projector/plays").header("Authorization", TestAccounts.studentBearer(context, "res-cheat"))
                        .contentType(MediaType.APPLICATION_JSON).content(body))
                .andExpect(status().isForbidden());
        mockMvc.perform(post("/api/projector/plays").header("Authorization", staff)
                        .contentType(MediaType.APPLICATION_JSON).content(body))
                .andExpect(status().isForbidden());
        // ...and a projector key is no good anywhere else.
        mockMvc.perform(get("/api/staff/results").header("Authorization", "Bearer " + key))
                .andExpect(status().isForbidden());

        assertThat(resultFor(resultsService.eventResults(), "res-keyed").plays()).isEqualTo(1);
    }

    @Test
    void aProjectorKeyStopsWorkingWhenTheStaffMemberWhoIssuedItIsLocked() throws Exception {
        String issuer = TestAccounts.staffBearer(context, "res.issuer");
        String key = objectMapper.readTree(mockMvc.perform(post("/api/staff/projector-key").header("Authorization", issuer))
                .andReturn().getResponse().getContentAsString()).get("key").asText();
        long id = staffAccountRepository.findByUsername("res.issuer").orElseThrow().getId();
        staffAccountService.setLocked(id, true, "results.staff");

        mockMvc.perform(post("/api/projector/plays").header("Authorization", "Bearer " + key)
                        .contentType(MediaType.APPLICATION_JSON).content("[]"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void renamingATeamKeepsItsScreenTime() {
        studentAccountService.createAccount("res-oldname", "Sunrise7");
        ImageMetadata advert = advert("res-oldname", ApprovalStatus.APPROVED, 10, false);
        resultsService.recordPlays(List.of(shown(advert, 20)));

        long id = studentAccountRepository.findByUsername("res-oldname").orElseThrow().getId();
        studentAccountService.renameAccount(id, "res-newname");

        assertThat(resultsService.studentResults("res-newname").team().seconds()).isEqualTo(20);
        assertThat(resultsService.eventResults().teams()).noneMatch(t -> t.team().equals("res-oldname"));
    }
}
