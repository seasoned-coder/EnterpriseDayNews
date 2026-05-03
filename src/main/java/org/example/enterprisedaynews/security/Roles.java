package org.example.enterprisedaynews.security;

/** Role constants used by Spring Security and the mock auth filter. */
public final class Roles {

    public static final String STUDENT = "STUDENT";
    public static final String STAFF = "STAFF";
    public static final String ROLE_PREFIX = "ROLE_";

    public static final String HEADER_USER = "X-User";
    public static final String HEADER_ROLE = "X-Role";

    private Roles() {
    }
}
