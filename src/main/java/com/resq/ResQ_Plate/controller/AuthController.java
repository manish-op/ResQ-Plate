package com.resq.ResQ_Plate.controller;

import com.resq.ResQ_Plate.dto.request.LoginRequest;
import com.resq.ResQ_Plate.dto.request.RegisterRequest;
import com.resq.ResQ_Plate.dto.response.ApiResponse;
import com.resq.ResQ_Plate.dto.response.AuthResponse;
import com.resq.ResQ_Plate.service.AuthService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
public class AuthController {

    private final AuthService authService;

    /**
     * POST /api/auth/register
     * Body: { email, password, name, role, organizationName?, address?, latitude?, longitude? }
     * Returns: { token, role, userId, name, email }
     */
    @PostMapping("/register")
    public ResponseEntity<ApiResponse<AuthResponse>> register(
            @Valid @RequestBody RegisterRequest request) {
        AuthResponse response = authService.register(request);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.success("Registration successful! Welcome to ResQ Plate.", response));
    }

    /**
     * POST /api/auth/login
     * Body: { email, password }
     * Returns: { token, role, userId, name, email }
     */
    @PostMapping("/login")
    public ResponseEntity<ApiResponse<AuthResponse>> login(
            @Valid @RequestBody LoginRequest request) {
        AuthResponse response = authService.login(request);
        return ResponseEntity.ok(ApiResponse.success("Login successful", response));
    }

    /**
     * GET /api/auth/me
     * Returns the currently authenticated user's email and roles.
     * Useful for frontend session validation.
     */
    @GetMapping("/me")
    public ResponseEntity<ApiResponse<Map<String, String>>> getCurrentUser(Authentication authentication) {
        return ResponseEntity.ok(ApiResponse.success(Map.of(
                "email", authentication.getName(),
                "authorities", authentication.getAuthorities().toString()
        )));
    }
}
