package org.example.enterprisedaynews.dto;

/** Optional body when rejecting an advert: why, shown to the student (issue #38). */
public record RejectRequest(String reason) {
}
