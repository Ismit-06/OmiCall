package com.videoplatform.match;

import java.util.HashMap;
import java.util.Map;

public class MatchResultDto {
    private Long matchId;
    private String token;
    private String livekitUrl;
    private String roomName;
    private Long otherUserId;
    private String otherUserName;
    private String otherUserProfilePicture;

    public MatchResultDto(Long matchId, String token, String livekitUrl, String roomName,
                          Long otherUserId, String otherUserName, String otherUserProfilePicture) {
        this.matchId = matchId;
        this.token = token;
        this.livekitUrl = livekitUrl;
        this.roomName = roomName;
        this.otherUserId = otherUserId;
        this.otherUserName = otherUserName;
        this.otherUserProfilePicture = otherUserProfilePicture;
    }

    public Long getMatchId() { return matchId; }
    public String getToken() { return token; }
    public String getLivekitUrl() { return livekitUrl; }
    public String getRoomName() { return roomName; }
    public Long getOtherUserId() { return otherUserId; }
    public String getOtherUserName() { return otherUserName; }
    public String getOtherUserProfilePicture() { return otherUserProfilePicture; }

    public Map<String, Object> getOtherUser() {
        Map<String, Object> map = new HashMap<>();
        map.put("id", otherUserId != null ? otherUserId : 0L);
        map.put("displayName", otherUserName != null ? otherUserName : "Anonymous");
        map.put("profilePicture", otherUserProfilePicture);
        return map;
    }
}

