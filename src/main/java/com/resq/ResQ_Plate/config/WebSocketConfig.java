package com.resq.ResQ_Plate.config;

import org.springframework.context.annotation.Configuration;
import org.springframework.messaging.simp.config.MessageBrokerRegistry;
import org.springframework.web.socket.config.annotation.EnableWebSocketMessageBroker;
import org.springframework.web.socket.config.annotation.StompEndpointRegistry;
import org.springframework.web.socket.config.annotation.WebSocketMessageBrokerConfigurer;

@Configuration
@EnableWebSocketMessageBroker
public class WebSocketConfig implements WebSocketMessageBrokerConfigurer {

    /**
     * Configure the in-memory STOMP message broker.
     *
     * Topic destinations (broadcast to all subscribers):
     *   /topic/donations/new      — new donation appeared
     *   /topic/donations/status   — donation status changed (claimed / completed)
     *
     * Queue destinations (private, sent to specific user):
     *   /user/{userId}/queue/notifications — donor notified when their donation is claimed
     */
    @Override
    public void configureMessageBroker(MessageBrokerRegistry config) {
        config.enableSimpleBroker("/topic", "/queue");
        config.setApplicationDestinationPrefixes("/app");
        config.setUserDestinationPrefix("/user");
    }

    /**
     * STOMP endpoint: ws://localhost:8080/ws
     * React connects via: new SockJS('http://localhost:8080/ws')
     */
    @Override
    public void registerStompEndpoints(StompEndpointRegistry registry) {
        registry.addEndpoint("/ws")
                .setAllowedOriginPatterns("*")
                .withSockJS();
    }
}
