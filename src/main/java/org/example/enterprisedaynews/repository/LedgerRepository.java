package org.example.enterprisedaynews.repository;

import org.example.enterprisedaynews.model.LedgerEntry;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

public interface LedgerRepository extends JpaRepository<LedgerEntry, Long> {

    List<LedgerEntry> findByTeamOrderByCreatedAtAscIdAsc(String team);

    @Query("select new org.example.enterprisedaynews.repository.LedgerTotals(e.team, e.kind, sum(e.amount), count(e)) "
            + "from LedgerEntry e group by e.team, e.kind")
    List<LedgerTotals> totalsByTeamAndKind();

    /** Keeps a renamed team's account with it. */
    @Modifying
    @Query("update LedgerEntry e set e.team = :newName where e.team = :oldName")
    int renameTeam(@Param("oldName") String oldName, @Param("newName") String newName);
}
