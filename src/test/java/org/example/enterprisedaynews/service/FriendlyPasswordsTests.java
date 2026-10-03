package org.example.enterprisedaynews.service;

import org.junit.jupiter.api.RepeatedTest;
import org.junit.jupiter.api.Test;

import java.util.HashSet;
import java.util.Random;
import java.util.Set;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatCode;

/** Issue #37: passwords printed on team login slips. */
class FriendlyPasswordsTests {

    private final FriendlyPasswords passwords = new FriendlyPasswords();

    @RepeatedTest(50)
    void looksLikeWordWordNumberAndMeetsTheStudentRules() {
        String password = passwords.next();

        assertThat(password).matches("[A-Z][a-z]+-[A-Z][a-z]+-[2-9]{2}");
        assertThatCode(() -> PasswordPolicy.validateNewPassword(password, PasswordPolicy.STUDENT_MIN_LENGTH))
                .doesNotThrowAnyException();
    }

    @Test
    void neverUsesDigitsThatLookLikeLetters() {
        FriendlyPasswords seeded = new FriendlyPasswords(new Random(1));
        for (int i = 0; i < 500; i++) {
            assertThat(seeded.next()).doesNotContain("0", "1");
        }
    }

    @Test
    void wordsAreSimpleLettersWithoutRepeatsInAList() {
        assertThat(FriendlyPasswords.FIRST).allMatch(w -> w.matches("[A-Z][a-z]+")).doesNotHaveDuplicates();
        assertThat(FriendlyPasswords.SECOND).allMatch(w -> w.matches("[A-Z][a-z]+")).doesNotHaveDuplicates();
    }

    @Test
    void givesDifferentPasswordsForDifferentTeams() {
        Set<String> made = new HashSet<>();
        for (int i = 0; i < 52; i++) {
            made.add(passwords.next());
        }
        assertThat(made).hasSizeGreaterThan(50);
    }
}
