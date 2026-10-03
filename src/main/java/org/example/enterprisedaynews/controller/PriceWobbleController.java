package org.example.enterprisedaynews.controller;

import lombok.RequiredArgsConstructor;
import org.example.enterprisedaynews.dto.PriceWobbleRequest;
import org.example.enterprisedaynews.dto.PriceWobbleView;
import org.example.enterprisedaynews.service.PriceList;
import org.example.enterprisedaynews.service.PriceWobbleService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

/** Staff controlling the price wobble (issue #41). Staff-only (SecurityConfig: /api/staff/**). */
@RestController
@RequestMapping("/api/staff")
@RequiredArgsConstructor
public class PriceWobbleController {

    private final PriceWobbleService priceWobbleService;

    /** The wobble in force or scheduled; 204 at normal prices. */
    @GetMapping("/price-wobble")
    public ResponseEntity<PriceWobbleView> current() {
        return priceWobbleService.current().map(ResponseEntity::ok).orElseGet(() -> ResponseEntity.noContent().build());
    }

    @PutMapping("/price-wobble")
    public PriceWobbleView set(@RequestBody PriceWobbleRequest request) {
        return priceWobbleService.set(request);
    }

    /** Back to normal prices now. */
    @DeleteMapping("/price-wobble")
    public ResponseEntity<Void> stop() {
        priceWobbleService.stop();
        return ResponseEntity.noContent().build();
    }

    /** The price list at {@code percent} of normal, to preview a wobble before setting it. */
    @GetMapping("/prices")
    public PriceList.Prices prices(@RequestParam(defaultValue = "100") int percent) {
        if (percent < PriceWobbleService.MIN_PERCENT || percent > PriceWobbleService.MAX_PERCENT) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Percent must be "
                    + PriceWobbleService.MIN_PERCENT + " to " + PriceWobbleService.MAX_PERCENT);
        }
        return PriceList.prices(percent, null);
    }
}
