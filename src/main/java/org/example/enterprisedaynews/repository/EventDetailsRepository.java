package org.example.enterprisedaynews.repository;

import org.example.enterprisedaynews.model.EventDetails;
import org.springframework.data.jpa.repository.JpaRepository;

public interface EventDetailsRepository extends JpaRepository<EventDetails, String> {
}
