package org.example.enterprisedaynews.service;

import org.springframework.stereotype.Component;

import java.security.SecureRandom;
import java.util.List;
import java.util.random.RandomGenerator;

/**
 * Passwords for team login slips (issue #37), e.g. {@code Tiger-Maple-47}: easy for a 13-year-old to read off
 * a slip and type on a phone, and they meet the student password rules (a capital letter and a number).
 * Digits avoid 0 and 1, which look like O and l on thermal paper. With the sign-in lockout (5 attempts) the
 * ~200,000 combinations are plenty for a one-day event on a private network.
 */
@Component
public class FriendlyPasswords {

    static final List<String> FIRST = List.of(
            "Tiger", "Panda", "Otter", "Falcon", "Dolphin", "Koala", "Badger", "Comet", "Rocket", "Planet",
            "Puffin", "Zebra", "Gecko", "Bison", "Raven", "Walrus", "Lynx", "Moose", "Hippo", "Parrot",
            "Penguin", "Shark", "Turtle", "Beaver", "Cobra", "Eagle", "Ferret", "Gopher", "Heron", "Jaguar",
            "Lemur", "Magpie", "Narwhal", "Osprey", "Pelican", "Quokka", "Rhino", "Salmon", "Toucan", "Viper",
            "Wombat", "Yak", "Camel", "Donkey", "Hamster", "Iguana", "Kitten", "Llama", "Meerkat", "Newt",
            "Robin", "Squid", "Tapir", "Weasel", "Bear", "Crab", "Duck", "Fox", "Goat", "Hare");

    static final List<String> SECOND = List.of(
            "Maple", "River", "Cloud", "Storm", "Sunny", "Pebble", "Forest", "Meadow", "Canyon", "Island",
            "Thunder", "Rainbow", "Crystal", "Breeze", "Glacier", "Harbour", "Lagoon", "Orchard", "Prairie", "Summit",
            "Valley", "Willow", "Acorn", "Blossom", "Cactus", "Daisy", "Ember", "Frost", "Garden", "Hazel",
            "Jungle", "Lantern", "Marble", "Nectar", "Ocean", "Pepper", "Quartz", "Ripple", "Saffron", "Tulip",
            "Velvet", "Waffle", "Biscuit", "Cookie", "Donut", "Mango", "Noodle", "Pickle", "Toffee", "Pretzel",
            "Rocket", "Jigsaw", "Kettle", "Magnet", "Pixel", "Rocky", "Sprout", "Tornado", "Volcano", "Wizard");

    private static final String DIGITS = "23456789";

    private final RandomGenerator random;

    public FriendlyPasswords() {
        this(new SecureRandom());
    }

    FriendlyPasswords(RandomGenerator random) {
        this.random = random;
    }

    public String next() {
        return FIRST.get(random.nextInt(FIRST.size()))
                + "-" + SECOND.get(random.nextInt(SECOND.size()))
                + "-" + DIGITS.charAt(random.nextInt(DIGITS.length()))
                + DIGITS.charAt(random.nextInt(DIGITS.length()));
    }
}
