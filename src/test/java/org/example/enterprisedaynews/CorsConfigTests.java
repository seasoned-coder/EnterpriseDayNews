package org.example.enterprisedaynews;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.web.servlet.MockMvc;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.options;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;

/** Issue #31: cross-origin access only for origins listed in APP_CORS_ALLOWED_ORIGINS. */
@SpringBootTest(properties = "app.cors.allowed-origins=https://frontend.example, https://second.example")
@AutoConfigureMockMvc
class CorsConfigTests {

    @Autowired
    private MockMvc mockMvc;

    @Test
    void listedOriginIsAllowed() throws Exception {
        mockMvc.perform(options("/api/auth/login")
                        .header("Origin", "https://second.example")
                        .header("Access-Control-Request-Method", "POST"))
                .andExpect(header().string("Access-Control-Allow-Origin", "https://second.example"));
    }

    @Test
    void unlistedOriginIsNotAllowed() throws Exception {
        mockMvc.perform(options("/api/auth/login")
                        .header("Origin", "https://evil.example")
                        .header("Access-Control-Request-Method", "POST"))
                .andExpect(header().doesNotExist("Access-Control-Allow-Origin"));
    }
}
