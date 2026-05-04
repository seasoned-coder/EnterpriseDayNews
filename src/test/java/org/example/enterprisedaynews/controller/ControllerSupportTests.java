package org.example.enterprisedaynews.controller;

import org.junit.jupiter.api.Test;
import java.security.Principal;
import static org.junit.jupiter.api.Assertions.assertEquals;
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
}
