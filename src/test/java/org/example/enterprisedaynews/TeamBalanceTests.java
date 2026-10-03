package org.example.enterprisedaynews;

import org.example.enterprisedaynews.dto.TeamBalance;
import org.example.enterprisedaynews.model.ImageMetadata;
import org.example.enterprisedaynews.model.ImageMetadata.ApprovalStatus;
import org.example.enterprisedaynews.model.LedgerEntry.Kind;
import org.example.enterprisedaynews.repository.ImageRepository;
import org.example.enterprisedaynews.repository.LedgerRepository;
import org.example.enterprisedaynews.repository.StudentAccountRepository;
import org.example.enterprisedaynews.service.EventResetService;
import org.example.enterprisedaynews.service.ImageService;
import org.example.enterprisedaynews.service.StudentAccountService;
import org.example.enterprisedaynews.service.TeamBalanceService;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.context.ApplicationContext;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;
import java.util.concurrent.TimeUnit;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/** Issue #48: what each team owes for its adverts, and staff marking it paid. */
@SpringBootTest
@AutoConfigureMockMvc
class TeamBalanceTests {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ApplicationContext context;

    @Autowired
    private ImageService imageService;

    @Autowired
    private TeamBalanceService balances;

    @Autowired
    private ImageRepository imageRepository;

    @Autowired
    private LedgerRepository ledgerRepository;

    @Autowired
    private StudentAccountService studentAccountService;

    @Autowired
    private StudentAccountRepository studentAccountRepository;

    @Autowired
    private EventResetService eventResetService;

    private final List<Long> created = new ArrayList<>();
    private String staff;

    @BeforeEach
    void setUp() {
        staff = TestAccounts.staffBearer(context, "bank.staff");
    }

    @AfterEach
    void cleanUp() {
        created.forEach(id -> imageRepository.findById(id).ifPresent(imageRepository::delete));
        created.clear();
        ledgerRepository.deleteAll();
    }

    private ImageMetadata advert(String team, int cost) {
        ImageMetadata saved = imageRepository.save(ImageMetadata.builder()
                .uploadedBy(team)
                .originalFileName("advert.png")
                .uploadedAt(LocalDateTime.now())
                .status(ApprovalStatus.NEW)
                .priority(2)
                .durationSeconds(20)
                .totalCost(cost)
                .build());
        created.add(saved.getId());
        return saved;
    }

    private void approve(ImageMetadata advert) {
        imageService.updateStatus(advert.getId(), ApprovalStatus.APPROVED, "bank.staff");
    }

    private void reject(ImageMetadata advert) {
        imageService.updateStatus(advert.getId(), ApprovalStatus.REJECTED, "bank.staff");
    }

    @Test
    void owedOnceApprovedAndNeverForRejectedAdverts() {
        ImageMetadata approved = advert("bank-owed", 20);
        ImageMetadata pending = advert("bank-owed", 15);
        ImageMetadata rejected = advert("bank-owed", 10);

        approve(approved);
        reject(rejected);

        TeamBalance balance = balances.balanceOf("bank-owed");
        assertThat(balance.owed()).isEqualTo(20);
        assertThat(balance.charged()).isEqualTo(20);
        assertThat(balance.advertsCharged()).isEqualTo(1);
        assertThat(balance.advertsUploaded()).isEqualTo(3);
        assertThat(pending.getId()).isNotNull();
    }

    @Test
    void anApprovedAdvertRejectedLaterIsCreditedBack() {
        ImageMetadata advert = advert("bank-refund", 25);
        approve(advert);
        reject(advert);

        TeamBalance balance = balances.balanceOf("bank-refund");
        assertThat(balance.owed()).isZero();
        assertThat(balance.credited()).isEqualTo(25);
        assertThat(balance.advertsCharged()).isZero();
        assertThat(balances.account("bank-refund").entries()).extracting(e -> e.kind())
                .containsExactly(Kind.CHARGE, Kind.CREDIT);
    }

    @Test
    void deletingAnApprovedAdvertStillOwesNoRefunds() {
        ImageMetadata advert = advert("bank-deleter", 30);
        approve(advert);

        imageService.deleteStudentImage(advert.getId(), "bank-deleter");

        TeamBalance balance = balances.balanceOf("bank-deleter");
        assertThat(balance.owed()).isEqualTo(30);
        assertThat(balance.advertsUploaded()).isZero(); // gone from the system...
        assertThat(balance.advertsCharged()).isEqualTo(1); // ...but still paid for
        assertThat(balances.account("bank-deleter").entries().get(0).description())
                .isEqualTo("Approved: advert.png (priority 2, 20 s)");
    }

    @Test
    void staffMarkTheWholeBalancePaidNoPartialPayments() throws Exception {
        approve(advert("bank-payer", 20));
        approve(advert("bank-payer", 15));

        // The amount must be the whole balance they saw.
        mockMvc.perform(post("/api/staff/balances/bank-payer/paid").header("Authorization", staff)
                        .contentType(MediaType.APPLICATION_JSON).content("{\"amount\":20}"))
                .andExpect(status().isConflict())
                .andExpect(content().string("bank-payer now owes 35 (not 20): check, take that amount, and try again"));

        mockMvc.perform(post("/api/staff/balances/bank-payer/paid").header("Authorization", staff)
                        .contentType(MediaType.APPLICATION_JSON).content("{\"amount\":35}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.owed").value(0))
                .andExpect(jsonPath("$.paid").value(35));

        // Nothing left to pay.
        mockMvc.perform(post("/api/staff/balances/bank-payer/paid").header("Authorization", staff)
                        .contentType(MediaType.APPLICATION_JSON).content("{\"amount\":0}"))
                .andExpect(status().isConflict());

        // Another advert approved afterwards starts a new balance.
        approve(advert("bank-payer", 10));
        assertThat(balances.balanceOf("bank-payer").owed()).isEqualTo(10);
        assertThat(balances.account("bank-payer").entries()).last()
                .satisfies(e -> assertThat(e.kind()).isEqualTo(Kind.CHARGE));
        assertThat(balances.account("bank-payer").entries()).filteredOn(e -> e.kind() == Kind.PAYMENT)
                .singleElement().satisfies(e -> assertThat(e.recordedBy()).isEqualTo("bank.staff"));
    }

    @Test
    void twoStaffMarkingPaidAtOnceRecordItOnce() throws Exception {
        approve(advert("bank-race", 40));
        ExecutorService pool = Executors.newFixedThreadPool(4);
        List<Future<Boolean>> tries = new ArrayList<>();
        for (int i = 0; i < 4; i++) {
            tries.add(pool.submit(() -> {
                try {
                    balances.markPaid("bank-race", 40, "bank.staff");
                    return true;
                } catch (ResponseStatusException e) {
                    assertThat(e.getStatusCode()).isEqualTo(HttpStatus.CONFLICT);
                    return false;
                }
            }));
        }
        pool.shutdown();
        assertThat(pool.awaitTermination(10, TimeUnit.SECONDS)).isTrue();
        long succeeded = 0;
        for (Future<Boolean> f : tries) {
            if (f.get()) succeeded++;
        }

        assertThat(succeeded).isEqualTo(1);
        assertThat(balances.balanceOf("bank-race").paid()).isEqualTo(40);
        assertThat(balances.balanceOf("bank-race").owed()).isZero();
    }

    @Test
    void aTeamSeesItsOwnBalanceButCantMarkItPaid() throws Exception {
        String team = TestAccounts.studentBearer(context, "bank-team");
        approve(advert("bank-team", 20));

        mockMvc.perform(get("/api/student/balance").header("Authorization", team))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.balance.owed").value(20))
                .andExpect(jsonPath("$.entries[0].kind").value("CHARGE"));
        mockMvc.perform(post("/api/staff/balances/bank-team/paid").header("Authorization", team)
                        .contentType(MediaType.APPLICATION_JSON).content("{\"amount\":20}"))
                .andExpect(status().isForbidden());
    }

    @Test
    void staffSeeEveryTeamIncludingOnesThatOweNothing() throws Exception {
        studentAccountService.createAccount("bank-quiet", "Sunrise7");
        approve(advert("bank-busy", 20));

        mockMvc.perform(get("/api/staff/balances").header("Authorization", staff))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[?(@.team == 'bank-quiet')].owed").value(0))
                .andExpect(jsonPath("$[?(@.team == 'bank-busy')].owed").value(20));
    }

    @Test
    void renamingATeamKeepsItsBalance() {
        studentAccountService.createAccount("bank-oldname", "Sunrise7");
        approve(advert("bank-oldname", 20));

        long id = studentAccountRepository.findByUsername("bank-oldname").orElseThrow().getId();
        studentAccountService.renameAccount(id, "bank-newname");

        assertThat(balances.balanceOf("bank-newname").owed()).isEqualTo(20);
        assertThat(balances.balanceOf("bank-oldname").owed()).isZero();
    }

    @Test
    void endOfDayClearsBalancesAndPayments() {
        approve(advert("bank-reset", 20));
        balances.markPaid("bank-reset", 20, "bank.staff");
        approve(advert("bank-reset", 10));

        eventResetService.resetEvent();

        TeamBalance balance = balances.balanceOf("bank-reset");
        assertThat(balance.owed()).isZero();
        assertThat(balance.paid()).isZero();
        assertThat(ledgerRepository.count()).isZero();
    }

    @Test
    void staffItemsAreNeverCharged() {
        ImageMetadata notice = imageRepository.save(ImageMetadata.builder()
                .uploadedBy("bank.staff").isInfoMessage(true).messageText("Lunch").uploadedAt(LocalDateTime.now())
                .status(ApprovalStatus.REJECTED).totalCost(10).build());
        created.add(notice.getId());

        approve(notice);

        assertThatThrownBy(() -> balances.markPaid("bank.staff", 10, "bank.staff"))
                .isInstanceOf(ResponseStatusException.class).hasMessageContaining("doesn't owe anything");
    }
}
