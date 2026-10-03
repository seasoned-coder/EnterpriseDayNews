package org.example.enterprisedaynews.repository;

import org.example.enterprisedaynews.model.LedgerEntry;

/** A team's total of one kind of ledger entry, and how many there were (issue #48). */
public record LedgerTotals(String team, LedgerEntry.Kind kind, Long amount, Long count) {
}
