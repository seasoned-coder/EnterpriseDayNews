package org.example.enterprisedaynews.dto;

import java.time.LocalDateTime;
import java.time.OffsetDateTime;
import java.time.ZoneId;

/**
 * Timestamps are stored as {@link LocalDateTime} in the server's time zone (UTC in Docker).
 * Without an offset, browsers parse them as their own local time and show the wrong hour,
 * so API responses always carry the offset explicitly.
 */
final class ApiTimes {

    private ApiTimes() {
    }

    static OffsetDateTime withServerOffset(LocalDateTime time) {
        return time == null ? null : time.atZone(ZoneId.systemDefault()).toOffsetDateTime();
    }
}
