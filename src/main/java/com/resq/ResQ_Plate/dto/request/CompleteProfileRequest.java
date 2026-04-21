package com.resq.ResQ_Plate.dto.request;

import com.resq.ResQ_Plate.entity.User;
import lombok.Data;

@Data
public class CompleteProfileRequest {
    private User.Role role;
    private String organizationName;
    private String address;
    private Double latitude;
    private Double longitude;
}
