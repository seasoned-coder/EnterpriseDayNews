package org.example.enterprisedaynews;

import org.example.enterprisedaynews.model.ImageMetadata;
import org.example.enterprisedaynews.model.ImageMetadata.ApprovalStatus;
import org.example.enterprisedaynews.repository.ImageRepository;
import org.example.enterprisedaynews.service.ImageService;
import org.example.enterprisedaynews.service.StudentAccountService;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpStatus;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.web.server.ResponseStatusException;

import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.concurrent.Callable;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicInteger;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Issue #36: many people using the apps at the same moment. These run the same work on many threads at
 * once and check that it all finishes (no deadlocks), and that clashes end in the friendly 409 rather than
 * an unexpected error. The full-size event simulation is the k6 script in loadtest/.
 */
@SpringBootTest
class ConcurrencyTests {

    private static final int THREADS = 12;

    @Autowired
    private StudentAccountService studentAccountService;

    @Autowired
    private ImageService imageService;

    @Autowired
    private ImageRepository imageRepository;

    private final List<Long> createdImages = Collections.synchronizedList(new ArrayList<>());

    @AfterEach
    void cleanUp() {
        for (Long id : createdImages) {
            imageService.deleteImage(id);
        }
        createdImages.clear();
    }

    /** Runs every task at the same moment and waits for them all; fails if any is still stuck after 30s. */
    private <T> List<Future<T>> allAtOnce(List<Callable<T>> tasks) throws InterruptedException {
        ExecutorService pool = Executors.newFixedThreadPool(tasks.size());
        CountDownLatch start = new CountDownLatch(1);
        try {
            List<Future<T>> futures = new ArrayList<>();
            for (Callable<T> task : tasks) {
                futures.add(pool.submit(() -> {
                    start.await();
                    return task.call();
                }));
            }
            start.countDown();
            pool.shutdown();
            assertThat(pool.awaitTermination(30, TimeUnit.SECONDS)).as("all finished (no deadlock)").isTrue();
            return futures;
        } finally {
            pool.shutdownNow();
        }
    }

    @Test
    void creatingTheSameAccountAtOnceGivesOneAccountAndConflictsForTheRest() throws Exception {
        AtomicInteger created = new AtomicInteger();
        AtomicInteger conflicts = new AtomicInteger();
        List<Callable<Void>> tasks = new ArrayList<>();
        for (int i = 0; i < THREADS; i++) {
            tasks.add(() -> {
                try {
                    studentAccountService.createAccount("raceco", "Sunrise7");
                    created.incrementAndGet();
                } catch (ResponseStatusException ex) {
                    assertThat(ex.getStatusCode()).isEqualTo(HttpStatus.CONFLICT);
                    conflicts.incrementAndGet();
                } catch (DataIntegrityViolationException ex) {
                    conflicts.incrementAndGet(); // ApiExceptionHandler turns this into a 409 too
                }
                return null;
            });
        }
        for (Future<Void> f : allAtOnce(tasks)) {
            f.get();
        }

        assertThat(created).hasValue(1);
        assertThat(conflicts).hasValue(THREADS - 1);
    }

    @Test
    void uploadsReviewsAndProjectorPollsAtOnceAllSucceed() throws Exception {
        List<Callable<Void>> tasks = new ArrayList<>();
        for (int i = 0; i < THREADS; i++) {
            String team = "busyco" + i;
            tasks.add(() -> {
                for (int n = 0; n < 5; n++) {
                    MockMultipartFile file = new MockMultipartFile("file", "advert.png", "image/png", new byte[]{1, 2, 3});
                    ImageMetadata upload = imageService.uploadImage(file, team, 1 + n % 4, 10, true);
                    createdImages.add(upload.getId());
                    imageService.updateStatus(upload.getId(), ApprovalStatus.APPROVED, "busy.staff");
                    imageService.getDisplayImages();
                    imageService.getNewImages();
                    assertThat(imageService.getUserUploads(team)).hasSize(n + 1);
                }
                return null;
            });
        }
        for (Future<Void> f : allAtOnce(tasks)) {
            f.get(); // rethrows anything that went wrong on that thread
        }

        assertThat(imageRepository.findAllById(createdImages))
                .hasSize(THREADS * 5)
                .allMatch(m -> m.getStatus() == ApprovalStatus.APPROVED && m.isDisplay());
    }
}
