package org.example.enterprisedaynews;

import org.example.enterprisedaynews.repository.StaffAccountRepository;
import org.example.enterprisedaynews.security.JwtProvider;
import org.example.enterprisedaynews.security.Roles;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.context.ApplicationContext;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;

import static org.hamcrest.Matchers.hasItem;
import static org.hamcrest.Matchers.not;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

/** Issue #12: staff managing other staff accounts through the API. */
@SpringBootTest
@AutoConfigureMockMvc
class StaffAccountControllerTests {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ApplicationContext context;

    @Autowired
    private StaffAccountRepository staffAccountRepository;

    @Autowired
    private JwtProvider jwtProvider;

    private String me;

    @BeforeEach
    void setUp() {
        me = TestAccounts.staffBearer(context, "manager.staff");
    }

    private long idOf(String username) {
        return staffAccountRepository.findByUsername(username).orElseThrow().getId();
    }

    @Test
    void createsAndListsStaffAccountsWithoutPasswordHashes() throws Exception {
        mockMvc.perform(post("/api/staff/staff-accounts")
                        .header("Authorization", me)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"username\":\"New.Teacher\",\"password\":\"Staffroom42\"}"))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.username").value("new.teacher"))
                .andExpect(jsonPath("$.passwordHash").doesNotExist());

        mockMvc.perform(get("/api/staff/staff-accounts").header("Authorization", me))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[*].username", hasItem("new.teacher")));
    }

    @Test
    void lockingAStaffAccountStopsItsExistingTokenImmediately() throws Exception {
        String theirs = TestAccounts.staffBearer(context, "locked.out.staff");
        mockMvc.perform(get("/api/staff/new").header("Authorization", theirs)).andExpect(status().isOk());

        mockMvc.perform(post("/api/staff/staff-accounts/{id}/lock", idOf("locked.out.staff"))
                        .param("locked", "true")
                        .header("Authorization", me))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.locked").value(true));

        // 401: their sign-in no longer counts, so the app sends them back to the sign-in page.
        mockMvc.perform(get("/api/staff/new").header("Authorization", theirs)).andExpect(status().isUnauthorized());

        mockMvc.perform(post("/api/staff/staff-accounts/{id}/lock", idOf("locked.out.staff"))
                        .param("locked", "false")
                        .header("Authorization", me))
                .andExpect(status().isOk());
        mockMvc.perform(get("/api/staff/new").header("Authorization", theirs)).andExpect(status().isOk());
    }

    @Test
    void deletingAStaffAccountStopsItsTokenAndRemovesIt() throws Exception {
        String theirs = TestAccounts.staffBearer(context, "leaving.staff");

        mockMvc.perform(delete("/api/staff/staff-accounts/{id}", idOf("leaving.staff")).header("Authorization", me))
                .andExpect(status().isNoContent());

        mockMvc.perform(get("/api/staff/new").header("Authorization", theirs)).andExpect(status().isUnauthorized());
        mockMvc.perform(get("/api/staff/staff-accounts").header("Authorization", me))
                .andExpect(jsonPath("$[*].username", not(hasItem("leaving.staff"))));
    }

    @Test
    void youCannotLockOrDeleteYourself() throws Exception {
        long myId = idOf("manager.staff");

        mockMvc.perform(post("/api/staff/staff-accounts/{id}/lock", myId).param("locked", "true").header("Authorization", me))
                .andExpect(status().isConflict())
                .andExpect(content().string("You can't lock your own account"));
        mockMvc.perform(delete("/api/staff/staff-accounts/{id}", myId).header("Authorization", me))
                .andExpect(status().isConflict())
                .andExpect(content().string("You can't delete your own account"));
    }

    @Test
    void resetsAnotherStaffPassword() throws Exception {
        TestAccounts.staffBearer(context, "forgetful.staff");

        mockMvc.perform(put("/api/staff/staff-accounts/{id}/password", idOf("forgetful.staff"))
                        .header("Authorization", me)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"password\":\"Remembered99\"}"))
                .andExpect(status().isOk());

        mockMvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"username\":\"forgetful.staff\",\"password\":\"Remembered99\",\"role\":\"STAFF\"}"))
                .andExpect(status().isOk());
    }

    @Test
    void studentsAndStrangersCannotManageStaff() throws Exception {
        mockMvc.perform(get("/api/staff/staff-accounts")).andExpect(status().isUnauthorized());

        String studentToken = TestAccounts.studentBearer(context, "nosy.student");
        mockMvc.perform(get("/api/staff/staff-accounts").header("Authorization", studentToken))
                .andExpect(status().isForbidden());
    }

    @Test
    void tokensForStaffAccountsThatDoNotExistAreRefused() throws Exception {
        String ghost = "Bearer " + jwtProvider.generateToken("never.existed", Roles.STAFF);
        mockMvc.perform(get("/api/staff/new").header("Authorization", ghost)).andExpect(status().isUnauthorized());
    }

    @Test
    void renamesAStaffAccountAndRefusesTakenNames() throws Exception {
        TestAccounts.staffBearer(context, "rename.me.staff");
        TestAccounts.staffBearer(context, "taken.staff");
        long id = idOf("rename.me.staff");

        mockMvc.perform(put("/api/staff/staff-accounts/{id}/username", id)
                        .header("Authorization", me)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"username\":\"Taken.Staff\"}"))
                .andExpect(status().isConflict())
                .andExpect(content().string("The username \"taken.staff\" is already taken by another staff account"));

        mockMvc.perform(put("/api/staff/staff-accounts/{id}/username", id)
                        .header("Authorization", me)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"username\":\"Renamed.Staff\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.username").value("renamed.staff"));
    }
}
