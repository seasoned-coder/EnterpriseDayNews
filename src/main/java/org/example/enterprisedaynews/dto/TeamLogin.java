package org.example.enterprisedaynews.dto;

/**
 * A team's sign-in details for a login slip (issue #37). The password is only ever returned once, straight
 * after it was set; it is stored hashed.
 *
 * @param status  CREATED, RESET (new password for an existing team) or SKIPPED (see {@code message})
 * @param password the new password, or {@code null} when skipped
 */
public record TeamLogin(String username, String password, Status status, String message) {

    public enum Status { CREATED, RESET, SKIPPED }

    public static TeamLogin created(String username, String password) {
        return new TeamLogin(username, password, Status.CREATED, null);
    }

    public static TeamLogin reset(String username, String password) {
        return new TeamLogin(username, password, Status.RESET, null);
    }

    public static TeamLogin skipped(String username, String reason) {
        return new TeamLogin(username, null, Status.SKIPPED, reason);
    }
}
