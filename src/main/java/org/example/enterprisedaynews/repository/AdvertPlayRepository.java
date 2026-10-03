package org.example.enterprisedaynews.repository;

import org.example.enterprisedaynews.model.AdvertPlay;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDateTime;
import java.util.List;

public interface AdvertPlayRepository extends JpaRepository<AdvertPlay, Long> {

    @Query("select new org.example.enterprisedaynews.repository.TeamPlayTotals(p.team, count(p), sum(p.seconds)) "
            + "from AdvertPlay p group by p.team")
    List<TeamPlayTotals> totalsByTeam();

    @Query("select new org.example.enterprisedaynews.repository.AdvertPlayTotals(p.imageId, count(p), sum(p.seconds)) "
            + "from AdvertPlay p where p.team = :team group by p.imageId")
    List<AdvertPlayTotals> totalsByAdvertForTeam(@Param("team") String team);

    @Query("select max(p.playedAt) from AdvertPlay p")
    LocalDateTime lastPlayedAt();

    /** Keeps a renamed team's screen time with it. */
    @Modifying
    @Query("update AdvertPlay p set p.team = :newName where p.team = :oldName")
    int renameTeam(@Param("oldName") String oldName, @Param("newName") String newName);
}
