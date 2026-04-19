package com.resq.ResQ_Plate.dto.request;

import com.resq.ResQ_Plate.entity.User;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.Data;

@Data
public class RegisterRequest {

    @NotBlank(message = "Email is required")
    @Email(message = "Must be a valid email address")
    private String email;

    @NotBlank(message = "Password is required")
    @Size(min = 8, message = "Password must be at least 8 characters")
    private String password;

    @NotBlank(message = "Name is required")
    private String name;

    @NotNull(message = "Role is required (DONOR, RECIPIENT, or ADMIN)")
    private User.Role role;

    private String organizationName;
    private String address;
    private Double latitude;
    private Double longitude;
}
