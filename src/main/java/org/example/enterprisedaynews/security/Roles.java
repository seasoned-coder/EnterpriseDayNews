package org.example.enterprisedaynews.security;

/** Role constants used by Spring Security and the mock auth filter. */
public final class Roles {

    public static final String STUDENT = "STUDENT";
    public static final String STAFF = "STAFF";
    /** The projector's key (issue #40): may only record which adverts it showed. Issued by a staff member. */
    public static final String PROJECTOR = "PROJECTOR";
    public static final String ROLE_PREFIX = "ROLE_";

    public static final String HEADER_USER = "X-User";
    public static final String HEADER_ROLE = "X-Role";

    private Roles() {
    }
}
