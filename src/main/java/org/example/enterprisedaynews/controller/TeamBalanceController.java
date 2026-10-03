package org.example.enterprisedaynews.controller;

import lombok.RequiredArgsConstructor;
import org.example.enterprisedaynews.dto.PaymentRequest;
import org.example.enterprisedaynews.dto.TeamAccount;
import org.example.enterprisedaynews.dto.TeamBalance;
import org.example.enterprisedaynews.service.TeamBalanceService;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.security.Principal;
import java.util.List;

/** What each team owes (issue #48). Staff-only and student-only by path (SecurityConfig). */
@RestController
@RequestMapping("/api")
@RequiredArgsConstructor
public class TeamBalanceController {

    private final TeamBalanceService teamBalanceService;

    /** Every team's balance, for the staff side and the End of Day report. */
    @GetMapping("/staff/balances")
    public List<TeamBalance> balances() {
        return teamBalanceService.balances();
    }

    @GetMapping("/staff/balances/{team}")
    public TeamAccount account(@PathVariable String team) {
        return teamBalanceService.account(team);
    }

    /** Every team's account for printing invoices (issue #50); {@code owing=true}: only teams that owe. */
    @GetMapping("/staff/invoices")
    public List<TeamAccount> invoices(@RequestParam(defaultValue = "true") boolean owing) {
        return teamBalanceService.accounts(owing);
    }

    /** Staff took the whole balance (the amount they saw) from the team's bank. */
    @PostMapping("/staff/balances/{team}/paid")
    public TeamBalance markPaid(@PathVariable String team, @RequestBody PaymentRequest payment, Principal principal) {
        return teamBalanceService.markPaid(team, payment.amount(), ControllerSupport.usernameOf(principal));
    }

    /** The signed-in team's own account. */
    @GetMapping("/student/balance")
    public TeamAccount myAccount(Principal principal) {
        return teamBalanceService.account(ControllerSupport.usernameOf(principal));
    }
}
