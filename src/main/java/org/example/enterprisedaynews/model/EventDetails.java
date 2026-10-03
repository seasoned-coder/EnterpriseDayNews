package org.example.enterprisedaynews.model;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

/**
 * Details printed on team login slips (issue #37): how to join the event Wi-Fi and the app's address.
 * One row; staff-only. Any field may be empty (the slip then leaves that part out).
 */
@Entity
@Table(name = "event_details")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class EventDetails {

    public static final String DEFAULT_ID = "DEFAULT";

    @Id
    @Builder.Default
    private String id = DEFAULT_ID;

    @Column(length = 32)
    private String wifiName;

    @Column(length = 63)
    private String wifiPassword;

    /** e.g. http://192.168.1.10. Empty: the staff page uses the address it was opened from. */
    @Column(length = 200)
    private String appAddress;
}
