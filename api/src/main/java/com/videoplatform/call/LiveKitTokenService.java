package com.videoplatform.call;

import com.auth0.jwt.JWT;
import com.auth0.jwt.algorithms.Algorithm;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.util.Date;
import java.util.HashMap;
import java.util.Map;

/**
 * Generates securely scoped LiveKit access tokens.
 * Enforces room name binding and participant identity.
 * Cryptographic E2EE keys are NOT managed here (they stay exclusively in the client).
 */
@Service
public class LiveKitTokenService {

    @Value("${app.livekit.api-key:devkey}")
    private String apiKey;

    @Value("${app.livekit.api-secret:secretsecretsecretsecretsecretsecret32}")
    private String apiSecret;

    @Value("${app.livekit.url:http://localhost:7880}")
    private String livekitUrl;

    public String generateToken(String roomName, String participantIdentity, String participantName) {
        Instant now = Instant.now();
        Instant expiresAt = now.plusSeconds(3600); // 1 hour token TTL

        Algorithm algorithm = Algorithm.HMAC256(apiSecret);

        Map<String, Object> videoGrant = new HashMap<>();
        videoGrant.put("room", roomName);
        videoGrant.put("roomJoin", true);
        videoGrant.put("canPublish", true);
        videoGrant.put("canSubscribe", true);
        videoGrant.put("canPublishData", true);

        return JWT.create()
                .withIssuer(apiKey)
                .withSubject(participantIdentity)
                .withIssuedAt(Date.from(now))
                .withExpiresAt(Date.from(expiresAt))
                .withNotBefore(Date.from(now))
                .withClaim("name", participantName)
                .withClaim("video", videoGrant)
                .sign(algorithm);
    }

    public String getLivekitUrl() {
        return livekitUrl;
    }
}
