package org.example.enterprisedaynews.dto;

/**
 * Staff marking a team's balance as paid (issue #48). {@code amount} is the balance they saw and took from the
 * team's bank: if it has changed since (e.g. another advert was approved), nothing is recorded.
 */
public record PaymentRequest(long amount) {
}
