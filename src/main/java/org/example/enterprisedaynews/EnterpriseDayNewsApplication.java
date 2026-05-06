package org.example.enterprisedaynews;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableScheduling;

@SpringBootApplication
@EnableScheduling
public class EnterpriseDayNewsApplication {
    public static void main(String[] args) {
        SpringApplication.run(EnterpriseDayNewsApplication.class, args);
    }
}
