package org.example.enterprisedaynews.service;

import lombok.RequiredArgsConstructor;
import org.example.enterprisedaynews.model.EventDetails;
import org.example.enterprisedaynews.repository.EventDetailsRepository;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.util.regex.Pattern;

/** The Wi-Fi and address details printed on team login slips (issue #37). */
@Service
@RequiredArgsConstructor
public class EventDetailsService {

    /** Wi-Fi network names are at most 32 bytes; WPA passwords 8–63 characters. */
    static final int MAX_WIFI_NAME = 32, MAX_WIFI_PASSWORD = 63, MAX_ADDRESS = 200;
    private static final Pattern WEB_ADDRESS = Pattern.compile("^https?://[^\\s/]+(/\\S*)?$");

    private final EventDetailsRepository repository;

    public EventDetails get() {
        return repository.findById(EventDetails.DEFAULT_ID).orElseGet(EventDetails::new);
    }

    @Transactional
    public EventDetails update(EventDetails incoming) {
        String wifiName = blankToNull(incoming.getWifiName());
        String wifiPassword = blankToNull(incoming.getWifiPassword());
        String appAddress = blankToNull(incoming.getAppAddress());
        requireMaxLength("Wi-Fi name", wifiName, MAX_WIFI_NAME);
        requireMaxLength("Wi-Fi password", wifiPassword, MAX_WIFI_PASSWORD);
        requireMaxLength("App address", appAddress, MAX_ADDRESS);
        if (appAddress != null) {
            appAddress = appAddress.replaceAll("/+$", "");
            if (!WEB_ADDRESS.matcher(appAddress).matches()) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                        "App address should look like http://192.168.1.10");
            }
        }
        return repository.save(new EventDetails(EventDetails.DEFAULT_ID, wifiName, wifiPassword, appAddress));
    }

    private static String blankToNull(String value) {
        return value == null || value.isBlank() ? null : value.trim();
    }

    private static void requireMaxLength(String name, String value, int max) {
        if (value != null && value.length() > max) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    name + " can be at most " + max + " characters");
        }
    }
}
