package com.resq.ResQ_Plate.controller;

import com.resq.ResQ_Plate.dto.response.ApiResponse;
import com.resq.ResQ_Plate.entity.TaxReport;
import com.resq.ResQ_Plate.entity.User;
import com.resq.ResQ_Plate.repository.TaxReportRepository;
import com.resq.ResQ_Plate.repository.UserRepository;
import com.resq.ResQ_Plate.service.TaxReportService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.time.YearMonth;
import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/reports")
@RequiredArgsConstructor
public class ReportController {

    private final TaxReportService taxReportService;
    private final TaxReportRepository taxReportRepository;
    private final UserRepository userRepository;

    /**
     * POST /api/reports/generate?donorId={uuid}&month=2026-03  [ADMIN only]
     * Manually triggers report generation + email for a specific donor and month.
     */
    @PostMapping("/generate")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ApiResponse<String>> triggerReport(
            @RequestParam UUID donorId,
            @RequestParam String month) {

        User donor = userRepository.findById(donorId)
                .orElseThrow(() -> new RuntimeException("Donor not found: " + donorId));

        YearMonth yearMonth = YearMonth.parse(month);
        TaxReport report = taxReportService.generateReport(donor, yearMonth);

        if (report == null) {
            return ResponseEntity.ok(ApiResponse.success(
                    "No completed donations found for " + donor.getEmail() + " in " + month, null));
        }

        return ResponseEntity.ok(ApiResponse.success(
                "Report generated and emailed to " + donor.getEmail(), report.getFilePath()));
    }

    /**
     * GET /api/reports/donor/{donorId}  [ADMIN or the DONOR themselves]
     * Lists all tax reports generated for a specific donor.
     */
    @GetMapping("/donor/{donorId}")
    @PreAuthorize("hasAnyRole('ADMIN', 'DONOR')")
    public ResponseEntity<ApiResponse<List<TaxReport>>> getDonorReports(
            @PathVariable UUID donorId) {
        return ResponseEntity.ok(
                ApiResponse.success(taxReportRepository.findByDonorIdOrderByGeneratedAtDesc(donorId))
        );
    }
}
