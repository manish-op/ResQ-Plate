package com.resq.ResQ_Plate.controller;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

/**
 * Simple health check endpoint — useful for deployment monitoring.
 * GET /api/health → { "status": "UP", "service": "ResQ Plate" }
 */
@RestController
@RequestMapping("/api/health")
public class HealthController {

    @GetMapping
    public Map<String, String> health() {
        return Map.of(
                "status", "UP",
                "service", "ResQ Plate — Zero Waste Food Rescue Network",
                "version", "1.0.0"
        );
    }
}
