package org.example.enterprisedaynews.live;

import jakarta.annotation.PreDestroy;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.event.TransactionPhase;
import org.springframework.transaction.event.TransactionalEventListener;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import java.io.IOException;
import java.time.Duration;
import java.util.Set;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.CopyOnWriteArrayList;
import java.util.concurrent.Executors;
import java.util.concurrent.ScheduledExecutorService;
import java.util.concurrent.TimeUnit;

/**
 * Tells open pages the moment something changes (issue #43), instead of every page asking every few seconds.
 *
 * <p>Each page keeps one Server-Sent Events connection ({@code GET /api/events}). Events are just a topic
 * name ("adverts", "prices", ...) with no data; the page then reloads that data through the normal API. So
 * the stream reveals nothing and needs no sign-in (EventSource can't send one anyway).
 *
 * <ul>
 *     <li>Sent only after the change is committed, so a reload sees it.</li>
 *     <li>Changes within {@link #COALESCE} are sent once (e.g. reordering many adverts, or End of Day).</li>
 *     <li>A "ping" every {@link #HEARTBEAT} keeps idle connections open through Wi-Fi and proxies, finds
 *     closed ones, and lets pages notice a stream that has silently died.</li>
 *     <li>Connections are asynchronous: 100+ open streams don't tie up server threads.</li>
 * </ul>
 */
@Slf4j
@Service
public class LiveUpdates {

    static final Duration COALESCE = Duration.ofMillis(250);
    static final Duration HEARTBEAT = Duration.ofSeconds(25);
    /** Browsers reconnect by themselves when a stream ends, so streams needn't live for ever. */
    static final Duration STREAM_LIFETIME = Duration.ofMinutes(30);

    private final CopyOnWriteArrayList<SseEmitter> listeners = new CopyOnWriteArrayList<>();
    private final Set<LiveTopic> pending = ConcurrentHashMap.newKeySet();
    private final ScheduledExecutorService scheduler = Executors.newSingleThreadScheduledExecutor(r -> {
        Thread t = new Thread(r, "live-updates");
        t.setDaemon(true);
        return t;
    });

    public LiveUpdates() {
        scheduler.scheduleAtFixedRate(this::heartbeat, HEARTBEAT.toMillis(), HEARTBEAT.toMillis(), TimeUnit.MILLISECONDS);
    }

    /** A new listening page. */
    public SseEmitter subscribe() {
        SseEmitter emitter = new SseEmitter(STREAM_LIFETIME.toMillis());
        listeners.add(emitter);
        emitter.onCompletion(() -> listeners.remove(emitter));
        emitter.onTimeout(() -> listeners.remove(emitter));
        emitter.onError(e -> listeners.remove(emitter));
        try {
            // Tells the page it's connected; also how long to wait before reconnecting if the stream drops.
            emitter.send(SseEmitter.event().name("hello").reconnectTime(3000).data("connected"));
        } catch (IOException e) {
            listeners.remove(emitter);
        }
        return emitter;
    }

    public int listenerCount() {
        return listeners.size();
    }

    /** Services publish {@link LiveTopic.Changed}; this sends it once the transaction has committed. */
    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT, fallbackExecution = true)
    public void onChanged(LiveTopic.Changed changed) {
        if (pending.add(changed.topic())) {
            scheduler.schedule(() -> send(changed.topic()), COALESCE.toMillis(), TimeUnit.MILLISECONDS);
        }
    }

    void send(LiveTopic topic) {
        pending.remove(topic);
        for (SseEmitter emitter : listeners) {
            try {
                emitter.send(SseEmitter.event().name(topic.eventName()).data(""));
            } catch (IOException | IllegalStateException e) {
                listeners.remove(emitter); // the page has gone
            }
        }
    }

    /**
     * A "ping" event (not just a comment) so pages can see the stream is alive: if pings stop arriving (e.g.
     * the Wi-Fi dropped without closing the connection), the page reconnects and polls meanwhile.
     */
    void heartbeat() {
        for (SseEmitter emitter : listeners) {
            try {
                emitter.send(SseEmitter.event().name("ping").data(""));
            } catch (IOException | IllegalStateException e) {
                listeners.remove(emitter);
            }
        }
    }

    @PreDestroy
    void stop() {
        scheduler.shutdownNow();
        listeners.forEach(SseEmitter::complete);
    }
}
