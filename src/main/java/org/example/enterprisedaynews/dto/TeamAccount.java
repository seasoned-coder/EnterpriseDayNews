package org.example.enterprisedaynews.dto;

import org.example.enterprisedaynews.model.LedgerEntry;

import java.time.OffsetDateTime;
import java.util.List;

import static org.example.enterprisedaynews.dto.ApiTimes.withServerOffset;

/** A team's balance and every charge, credit and payment behind it (issue #48), oldest first. */
public record TeamAccount(TeamBalance balance, List<Entry> entries) {

    public record Entry(LedgerEntry.Kind kind, int amount, String description, OffsetDateTime at, String recordedBy) {

        public static Entry from(LedgerEntry e) {
            return new Entry(e.getKind(), e.getAmount(), e.getDescription(), withServerOffset(e.getCreatedAt()),
                    e.getRecordedBy());
        }
    }
}
