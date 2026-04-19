package com.resq.ResQ_Plate.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Data;

@Data
public class AiListingRequest {

    /**
     * The raw, natural-language sentence from the donor.
     * Example: "We have 15 loaves of sourdough and 2 trays of muffins expiring
     * tomorrow morning."
     */
    @NotBlank(message = "Raw text description is required")
    @Size(min = 3, max = 1000, message = "Description must be between 3 and 1000 characters")
    private String rawText;
}
