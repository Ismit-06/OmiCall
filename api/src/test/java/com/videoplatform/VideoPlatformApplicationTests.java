package com.videoplatform;

import org.junit.jupiter.api.Test;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;

@SpringBootTest
@ActiveProfiles("dev")
class VideoPlatformApplicationTests {

    @Test
    void contextLoads() {
        // Verifies that the full Spring context starts without errors
    }
}
