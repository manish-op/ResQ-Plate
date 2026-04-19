package com.resq.ResQ_Plate.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.client.RestTemplate;

@Configuration
public class SpringAiConfig {

    /**
     * RestTemplate bean used by AiListingService to call the Gemini native REST API.
     *
     * We call the Gemini API directly (not via Spring AI's OpenAI adapter) to avoid
     * the "Multiple authentication credentials received" error that occurs when
     * new AQ. format keys are sent as Bearer tokens to the OpenAI-compatible endpoint.
     *
     * The AiListingService sends the key as a URL query parameter only (?key=...).
     */
    @Bean
    public RestTemplate restTemplate() {
        return new RestTemplate();
    }
}
