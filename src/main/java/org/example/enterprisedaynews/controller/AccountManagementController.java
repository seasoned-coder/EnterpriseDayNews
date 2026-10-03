package org.example.enterprisedaynews.controller;

import org.example.enterprisedaynews.dto.AccountView;
import org.example.enterprisedaynews.dto.CreateAccountRequest;
import org.example.enterprisedaynews.dto.RenameAccountRequest;
import org.example.enterprisedaynews.dto.UpdatePasswordRequest;
import org.example.enterprisedaynews.model.LoginAccount;
import org.example.enterprisedaynews.service.AccountService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.security.Principal;
import java.util.List;

/**
 * The staff-only endpoints for managing one kind of account. Subclasses only choose the URL and service.
 * Staff-only is enforced by SecurityConfig ("/api/staff/**").
 */
public abstract class AccountManagementController<T extends LoginAccount> {

    private final AccountService<T> accountService;

    protected AccountManagementController(AccountService<T> accountService) {
        this.accountService = accountService;
    }

    @GetMapping
    public List<AccountView> list() {
        return accountService.listAccounts().stream().map(AccountView::from).toList();
    }

    @PostMapping
    public ResponseEntity<AccountView> create(@RequestBody CreateAccountRequest request) {
        return ResponseEntity.status(201).body(AccountView.from(
                accountService.createAccount(request.username(), request.password())));
    }

    @PostMapping("/{id}/lock")
    public AccountView setLocked(@PathVariable Long id, @RequestParam boolean locked, Principal principal) {
        return AccountView.from(accountService.setLocked(id, locked, ControllerSupport.usernameOf(principal)));
    }

    @PutMapping("/{id}/password")
    public AccountView changePassword(@PathVariable Long id, @RequestBody UpdatePasswordRequest request) {
        return AccountView.from(accountService.changePassword(id, request.password()));
    }

    @PutMapping("/{id}/username")
    public AccountView rename(@PathVariable Long id, @RequestBody RenameAccountRequest request) {
        return AccountView.from(accountService.renameAccount(id, request.username()));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable Long id, Principal principal) {
        accountService.deleteAccount(id, ControllerSupport.usernameOf(principal));
        return ResponseEntity.noContent().build();
    }
}
