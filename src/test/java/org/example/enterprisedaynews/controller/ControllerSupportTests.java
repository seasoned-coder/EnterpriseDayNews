package org.example.enterprisedaynews.controller;

import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockHttpServletRequest;

import java.security.Principal;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

class ControllerSupportTests {

    @Test
    void testUsernameOf() {
        // Valid principal
        Principal principal = mock(Principal.class);
        when(principal.getName()).thenReturn("user1");
        assertEquals("user1", ControllerSupport.usernameOf(principal));

        // Null principal
        assertEquals("anonymous", ControllerSupport.usernameOf(null));

        // Null name
        when(principal.getName()).thenReturn(null);
        assertEquals("anonymous", ControllerSupport.usernameOf(principal));

        // Blank name
        when(principal.getName()).thenReturn("  ");
        assertEquals("anonymous", ControllerSupport.usernameOf(principal));
    }

    @Test
    void clientIpIgnoresForwardingHeadersItself() {
        // Tomcat resolves trusted forwarding headers into remoteAddr; reading them here would let clients fake their IP.
        MockHttpServletRequest request = new MockHttpServletRequest();
        request.setRemoteAddr("198.51.100.20");
        request.addHeader("X-Forwarded-For", "6.6.6.6");
        request.addHeader("X-Real-IP", "6.6.6.7");

        assertEquals("198.51.100.20", ControllerSupport.clientIpOf(request));
        assertNull(ControllerSupport.clientIpOf(null));
    }
}
