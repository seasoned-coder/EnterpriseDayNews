package org.example.enterprisedaynews.model;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Entity
@Table(name = "display_settings")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class DisplaySettings {

    @Id
    private String id = "DEFAULT"; // Singleton settings for now

    private int intervalSpeedSeconds;
    private int displayDurationSeconds;
}
