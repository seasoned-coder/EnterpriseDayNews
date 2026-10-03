package org.example.enterprisedaynews;

import org.example.enterprisedaynews.dto.TeamLogin;
import org.example.enterprisedaynews.dto.TeamLogin.Status;
import org.example.enterprisedaynews.repository.StudentAccountRepository;
import org.example.enterprisedaynews.service.StudentAccountService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.context.ApplicationContext;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.web.server.ResponseStatusException;

import java.util.Collections;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.hamcrest.Matchers.matchesPattern;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

/** Issue #37: creating team accounts in bulk and the details printed on their login slips. */
@SpringBootTest
@AutoConfigureMockMvc
class TeamSetupTests {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ApplicationContext context;

    @Autowired
    private StudentAccountService studentAccountService;

    @Autowired
    private StudentAccountRepository studentAccountRepository;

    private String staff;

    @BeforeEach
    void setUp() {
        staff = TestAccounts.staffBearer(context, "slip.printer");
    }

    @Test
    void createsEachTeamWithAPasswordThatWorks() {
        List<TeamLogin> made = studentAccountService.createTeams(List.of("bulk-team01", " Bulk-Team02 "));

        assertThat(made).extracting(TeamLogin::username).containsExactly("bulk-team01", "bulk-team02");
        assertThat(made).allMatch(t -> t.status() == Status.CREATED && t.password() != null);
        for (TeamLogin team : made) {
            assertThat(studentAccountService.authenticate(team.username(), team.password()).getUsername())
                    .isEqualTo(team.username());
        }
    }

    @Test
    void skipsTakenRepeatedAndInvalidNamesButCreatesTheRest() {
        studentAccountService.createAccount("bulk-taken", "Sunrise7");

        List<TeamLogin> made = studentAccountService.createTeams(
                List.of("bulk-taken", "bulk-fresh", "BULK-FRESH", "bad name!", ""));

        assertThat(made).extracting(TeamLogin::status)
                .containsExactly(Status.SKIPPED, Status.CREATED, Status.SKIPPED, Status.SKIPPED, Status.SKIPPED);
        assertThat(made.get(0).message()).contains("already exists");
        assertThat(made.get(0).password()).isNull();
        assertThat(made.get(2).message()).isEqualTo("Listed twice");
        assertThat(made.get(3).message()).contains("letters, numbers");
        assertThat(made.get(4).message()).isEqualTo("Username is required");
        assertThat(studentAccountRepository.existsByUsername("bulk-fresh")).isTrue();
    }

    @Test
    void refusesAnEmptyOrHugeList() {
        assertThatThrownBy(() -> studentAccountService.createTeams(List.of()))
                .isInstanceOf(ResponseStatusException.class).hasMessageContaining("at least one");
        assertThatThrownBy(() -> studentAccountService.createTeams(Collections.nCopies(201, "x")))
                .isInstanceOf(ResponseStatusException.class).hasMessageContaining("up to 200");
    }

    @Test
    void aNewGeneratedPasswordReplacesTheOldOne() {
        long id = studentAccountService.createAccount("bulk-reprint", "Sunrise7").getId();

        TeamLogin reset = studentAccountService.newGeneratedPassword(id);

        assertThat(reset.status()).isEqualTo(Status.RESET);
        assertThat(studentAccountService.authenticate("bulk-reprint", reset.password()).getUsername())
                .isEqualTo("bulk-reprint");
        assertThatThrownBy(() -> studentAccountService.authenticate("bulk-reprint", "Sunrise7"))
                .isInstanceOf(ResponseStatusException.class);
    }

    @Test
    void staffCreateTeamsAndReprintThroughTheApi() throws Exception {
        mockMvc.perform(post("/api/staff/students/teams")
                        .header("Authorization", staff)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"usernames\":[\"api-team01\",\"api-team02\"]}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(2))
                .andExpect(jsonPath("$[0].username").value("api-team01"))
                .andExpect(jsonPath("$[0].status").value("CREATED"))
                .andExpect(jsonPath("$[0].password", matchesPattern("[A-Z][a-z]+-[A-Z][a-z]+-[2-9]{2}")));

        long id = studentAccountRepository.findByUsername("api-team02").orElseThrow().getId();
        mockMvc.perform(post("/api/staff/students/" + id + "/generated-password").header("Authorization", staff))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.username").value("api-team02"))
                .andExpect(jsonPath("$.status").value("RESET"));
    }

    @Test
    void studentsCantCreateTeamsOrReadTheEventDetails() throws Exception {
        String student = TestAccounts.studentBearer(context, "nosy-team");

        mockMvc.perform(post("/api/staff/students/teams")
                        .header("Authorization", student)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"usernames\":[\"sneaky\"]}"))
                .andExpect(status().isForbidden());
        mockMvc.perform(get("/api/staff/event-details").header("Authorization", student))
                .andExpect(status().isForbidden());
    }

    @Test
    void staffSaveTheWifiAndAddressForTheSlips() throws Exception {
        mockMvc.perform(put("/api/staff/event-details")
                        .header("Authorization", staff)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"wifiName\":\" EnterpriseDay \",\"wifiPassword\":\"Sunflower88\","
                                + "\"appAddress\":\"http://192.168.1.10/\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.wifiName").value("EnterpriseDay"))
                .andExpect(jsonPath("$.appAddress").value("http://192.168.1.10"));

        mockMvc.perform(get("/api/staff/event-details").header("Authorization", staff))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.wifiPassword").value("Sunflower88"));

        // Blank fields are cleared.
        mockMvc.perform(put("/api/staff/event-details")
                        .header("Authorization", staff)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"wifiName\":\"EnterpriseDay\",\"wifiPassword\":\" \",\"appAddress\":\"\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.wifiPassword").doesNotExist())
                .andExpect(jsonPath("$.appAddress").doesNotExist());
    }

    @Test
    void rejectsAnAddressThatIsntAWebAddressOrTooLongWifiDetails() throws Exception {
        mockMvc.perform(put("/api/staff/event-details")
                        .header("Authorization", staff)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"appAddress\":\"192.168.1.10\"}"))
                .andExpect(status().isBadRequest())
                .andExpect(content().string("App address should look like http://192.168.1.10"));

        mockMvc.perform(put("/api/staff/event-details")
                        .header("Authorization", staff)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"wifiName\":\"" + "x".repeat(33) + "\"}"))
                .andExpect(status().isBadRequest())
                .andExpect(content().string("Wi-Fi name can be at most 32 characters"));
    }
}
