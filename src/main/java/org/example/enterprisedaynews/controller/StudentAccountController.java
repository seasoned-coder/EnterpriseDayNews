package org.example.enterprisedaynews.controller;

import org.example.enterprisedaynews.model.StudentAccount;
import org.example.enterprisedaynews.service.StudentAccountService;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/** Staff managing student (company) accounts (issue #11). */
@RestController
@RequestMapping("/api/staff/students")
public class StudentAccountController extends AccountManagementController<StudentAccount> {

    public StudentAccountController(StudentAccountService studentAccountService) {
        super(studentAccountService);
    }
}
