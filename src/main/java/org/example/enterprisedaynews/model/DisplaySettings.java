package org.example.enterprisedaynews.model;

import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Entity
@Table(name = "display_settings")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class DisplaySettings {

    /** Singleton id for the single settings row. */
    public static final String DEFAULT_ID = "DEFAULT";
    public static final int DEFAULT_INTERVAL_SECONDS = 5;
    public static final int DEFAULT_DURATION_SECONDS = 10;
    public static final int DEFAULT_REFRESH_SECONDS = 60;

    @Id
    private String id = DEFAULT_ID;

    private int intervalSpeedSeconds;
    private int displayDurationSeconds;
    private int imageRefreshSeconds;

    public static DisplaySettings defaults() {
        return DisplaySettings.builder()
                .id(DEFAULT_ID)
                .intervalSpeedSeconds(DEFAULT_INTERVAL_SECONDS)
                .displayDurationSeconds(DEFAULT_DURATION_SECONDS)
                .imageRefreshSeconds(DEFAULT_REFRESH_SECONDS)
                .build();
    }
}
