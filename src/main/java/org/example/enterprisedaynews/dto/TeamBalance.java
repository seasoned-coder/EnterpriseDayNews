package org.example.enterprisedaynews.dto;

/**
 * A team's account (issue #48), in event money.
 *
 * @param charged          approved adverts' prices
 * @param credited         given back for approved adverts later rejected
 * @param paid             taken from the team's bank by staff
 * @param owed             charged - credited - paid (negative = in credit)
 * @param advertsUploaded  adverts the team has in the system now (deleted ones aren't counted)
 * @param advertsCharged   adverts it has been charged for (approved), net of any later rejected
 */
public record TeamBalance(String team, long charged, long credited, long paid, long owed,
                          long advertsUploaded, long advertsCharged) {
}
