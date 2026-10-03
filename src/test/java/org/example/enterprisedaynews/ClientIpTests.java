package org.example.enterprisedaynews;

import org.example.enterprisedaynews.repository.StudentAccountRepository;
import org.example.enterprisedaynews.security.Roles;
import org.example.enterprisedaynews.service.StudentAccountService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.web.client.TestRestTemplate;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;

import java.util.Map;

import static org.junit.jupiter.api.Assertions.assertEquals;

/**
 * Issue #31: the recorded login IP comes from Tomcat's forwarded-header handling, which only trusts
 * X-Forwarded-For from internal proxies and walks it right-to-left. Needs a real server (MockMvc skips Tomcat).
 */
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
class ClientIpTests {

    @Autowired
    private TestRestTemplate rest;

    @Autowired
    private StudentAccountService studentAccountService;

    @Autowired
    private StudentAccountRepository studentAccountRepository;

    private String loginAndReadIp(String username, String forwardedFor) {
        if (!studentAccountRepository.existsByUsername(username)) {
            studentAccountService.createAccount(username, "IpTest42");
        }
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        if (forwardedFor != null) {
            headers.set("X-Forwarded-For", forwardedFor);
        }
        ResponseEntity<String> response = rest.postForEntity("/api/auth/login",
                new HttpEntity<>(Map.of("username", username, "password", "IpTest42", "role", Roles.STUDENT), headers),
                String.class);
        assertEquals(200, response.getStatusCode().value(), response.getBody());
        return studentAccountRepository.findByUsername(username).orElseThrow().getLastLoginIp();
    }

    @Test
    void usesClientAddressAddedByOurProxy() {
        // Test client connects from 127.0.0.1, which counts as an internal proxy (like nginx on the Docker network).
        assertEquals("203.0.113.9", loginAndReadIp("ipco1", "203.0.113.9"));
    }

    @Test
    void ignoresAddressesFakedByTheClient() {
        // A client sent "6.6.6.6"; our proxy appended the real address. The right-most external address wins.
        assertEquals("203.0.113.9", loginAndReadIp("ipco2", "6.6.6.6, 203.0.113.9"));
    }

    @Test
    void fallsBackToConnectionAddressWithoutHeader() {
        assertEquals("127.0.0.1", loginAndReadIp("ipco3", null));
    }
}
