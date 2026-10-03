package org.example.enterprisedaynews.controller;

import org.example.enterprisedaynews.model.StaffAccount;
import org.example.enterprisedaynews.service.StaffAccountService;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/** Staff managing each other's accounts (issue #12). */
@RestController
@RequestMapping("/api/staff/staff-accounts")
public class StaffAccountController extends AccountManagementController<StaffAccount> {

    public StaffAccountController(StaffAccountService staffAccountService) {
        super(staffAccountService);
    }
}
