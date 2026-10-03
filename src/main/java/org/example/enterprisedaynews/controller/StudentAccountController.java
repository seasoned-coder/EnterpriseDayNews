package org.example.enterprisedaynews.controller;

import org.example.enterprisedaynews.dto.CreateTeamsRequest;
import org.example.enterprisedaynews.dto.TeamLogin;
import org.example.enterprisedaynews.model.StudentAccount;
import org.example.enterprisedaynews.service.StudentAccountService;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

/** Staff managing student (company) accounts (issue #11). */
@RestController
@RequestMapping("/api/staff/students")
public class StudentAccountController extends AccountManagementController<StudentAccount> {

    private final StudentAccountService studentAccountService;

    public StudentAccountController(StudentAccountService studentAccountService) {
        super(studentAccountService);
        this.studentAccountService = studentAccountService;
    }

    /** Creates many team accounts with generated passwords, for printing login slips (issue #37). */
    @PostMapping("/teams")
    public List<TeamLogin> createTeams(@RequestBody CreateTeamsRequest request) {
        return studentAccountService.createTeams(request.usernames());
    }

    /** A new generated password for one team, e.g. to reprint a lost slip (issue #37). */
    @PostMapping("/{id}/generated-password")
    public TeamLogin newGeneratedPassword(@PathVariable Long id) {
        return studentAccountService.newGeneratedPassword(id);
    }
}
