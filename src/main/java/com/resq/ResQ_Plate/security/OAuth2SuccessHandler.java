package com.resq.ResQ_Plate.security;

import com.resq.ResQ_Plate.entity.User;
import com.resq.ResQ_Plate.repository.UserRepository;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.core.Authentication;
import org.springframework.security.oauth2.core.user.OAuth2User;
import org.springframework.security.web.authentication.SimpleUrlAuthenticationSuccessHandler;
import org.springframework.stereotype.Component;
import org.springframework.web.util.UriComponentsBuilder;

import java.io.IOException;

@Component
@RequiredArgsConstructor
@Slf4j
public class OAuth2SuccessHandler extends SimpleUrlAuthenticationSuccessHandler {

    private final JwtUtil jwtUtil;
    private final UserRepository userRepository;

    @Value("${app.frontend-url:http://localhost:5173}")
    private String frontendUrl;

    @Override
    public void onAuthenticationSuccess(HttpServletRequest request, HttpServletResponse response,
                                        Authentication authentication) throws IOException {
        
        OAuth2User oauth2User = (OAuth2User) authentication.getPrincipal();
        String email = oauth2User.getAttribute("email");
        
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("User not found after social login"));

        String token = jwtUtil.generateToken(user.getEmail(), user.getRole().name(), user.getId().toString());
        String refreshToken = jwtUtil.generateRefreshToken(user.getEmail(), user.getRole().name(), user.getId().toString());

        boolean isPending = user.getRole() == User.Role.PENDING;

        String targetUrl = UriComponentsBuilder.fromUriString(frontendUrl + "/oauth-callback")
                .queryParam("token", token)
                .queryParam("refreshToken", refreshToken)
                .queryParam("pending", isPending)
                .build().toUriString();

        log.info("Social login success for {}. Redirecting to callback. Pending: {}", email, isPending);
        
        getRedirectStrategy().sendRedirect(request, response, targetUrl);
    }
}
