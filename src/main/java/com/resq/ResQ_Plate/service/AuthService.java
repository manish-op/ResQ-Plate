package com.resq.ResQ_Plate.service;

import com.resq.ResQ_Plate.dto.request.LoginRequest;
import com.resq.ResQ_Plate.dto.request.RegisterRequest;
import com.resq.ResQ_Plate.dto.response.AuthResponse;
import com.resq.ResQ_Plate.entity.User;
import com.resq.ResQ_Plate.repository.UserRepository;
import com.resq.ResQ_Plate.security.JwtUtil;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
@Slf4j
public class AuthService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtUtil jwtUtil;
    private final AuthenticationManager authenticationManager;
    private final AuditService auditService;
    private final jakarta.servlet.http.HttpServletRequest httpServletRequest;

    public AuthResponse register(RegisterRequest request) {
        if (userRepository.existsByEmail(request.getEmail())) {
            throw new RuntimeException("An account with this email already exists");
        }

        User user = User.builder()
                .email(request.getEmail())
                .passwordHash(passwordEncoder.encode(request.getPassword()))
                .name(request.getName())
                .role(request.getRole())
                .organizationName(request.getOrganizationName())
                .address(request.getAddress())
                .latitude(request.getLatitude())
                .longitude(request.getLongitude())
                .build();

        user = userRepository.save(user);
        log.info("New user registered: {} ({})", user.getEmail(), user.getRole());
        auditService.log(user, com.resq.ResQ_Plate.entity.AuditLog.Action.REGISTER, "New account created", httpServletRequest);

        String token = jwtUtil.generateToken(user.getEmail(), user.getRole().name(), user.getId().toString());
        String refreshToken = jwtUtil.generateRefreshToken(user.getEmail(), user.getRole().name(), user.getId().toString());

        return buildAuthResponse(user, token, refreshToken);
    }

    public AuthResponse login(LoginRequest request) {
        // Throws BadCredentialsException if invalid
        authenticationManager.authenticate(
                new UsernamePasswordAuthenticationToken(request.getEmail(), request.getPassword())
        );

        User user = userRepository.findByEmail(request.getEmail())
                .orElseThrow(() -> new RuntimeException("User not found"));

        String token = jwtUtil.generateToken(user.getEmail(), user.getRole().name(), user.getId().toString());
        String refreshToken = jwtUtil.generateRefreshToken(user.getEmail(), user.getRole().name(), user.getId().toString());
        
        log.info("User logged in: {}", user.getEmail());
        auditService.log(user, com.resq.ResQ_Plate.entity.AuditLog.Action.LOGIN, "Successful login", httpServletRequest);

        return buildAuthResponse(user, token, refreshToken);
    }

    public AuthResponse refreshToken(String refreshToken) {
        if (jwtUtil.isTokenExpired(refreshToken)) {
            throw new RuntimeException("Refresh token expired. Please log in again.");
        }

        String email = jwtUtil.extractEmail(refreshToken);
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("User not found"));

        String newToken = jwtUtil.generateToken(user.getEmail(), user.getRole().name(), user.getId().toString());
        String newRefreshToken = jwtUtil.generateRefreshToken(user.getEmail(), user.getRole().name(), user.getId().toString());

        return buildAuthResponse(user, newToken, newRefreshToken);
    }

    public AuthResponse completeProfile(String email, com.resq.ResQ_Plate.dto.request.CompleteProfileRequest request) {
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("User not found"));

        if (user.getRole() != User.Role.PENDING) {
            throw new RuntimeException("Profile is already completed");
        }

        user.setRole(request.getRole());
        user.setOrganizationName(request.getOrganizationName());
        user.setAddress(request.getAddress());
        user.setLatitude(request.getLatitude());
        user.setLongitude(request.getLongitude());

        user = userRepository.save(user);
        log.info("User {} completed their profile as {}", email, user.getRole());
        auditService.log(user, com.resq.ResQ_Plate.entity.AuditLog.Action.USER_PROFILE_UPDATE, "Completed social profile", httpServletRequest);

        String token = jwtUtil.generateToken(user.getEmail(), user.getRole().name(), user.getId().toString());
        String refreshToken = jwtUtil.generateRefreshToken(user.getEmail(), user.getRole().name(), user.getId().toString());

        return buildAuthResponse(user, token, refreshToken);
    }

    private AuthResponse buildAuthResponse(User user, String token, String refreshToken) {
        return AuthResponse.builder()
                .token(token)
                .refreshToken(refreshToken)
                .role(user.getRole().name())
                .userId(user.getId())
                .name(user.getName())
                .email(user.getEmail())
                .organizationName(user.getOrganizationName())
                .build();
    }
}
