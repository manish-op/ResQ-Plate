package com.resq.ResQ_Plate.mcp.tools;

import com.resq.ResQ_Plate.entity.TaxReport;
import com.resq.ResQ_Plate.entity.User;
import com.resq.ResQ_Plate.repository.UserRepository;
import com.resq.ResQ_Plate.service.TaxReportService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Description;

import java.time.YearMonth;
import java.util.function.Function;

@Configuration
@RequiredArgsConstructor
@Slf4j
public class SupportBotTools {

    private final TaxReportService taxReportService;
    private final UserRepository userRepository;

    public record TaxReportRequest(String donorEmail, int year, int month) {}
    public record TaxReportResult(boolean success, String message, String filePath, String downloadUrl) {}

    // Tool Name: generateTaxReport
    // Description: Generates a tax report for a donor for a specific year and month.
    @Bean
    @Description("Generates an Excel tax deduction report for a donor for a specific year and month. Requires the donor email, year, and month (1-12). Returns the file path and a download URL for the report.")
    public Function<TaxReportRequest, TaxReportResult> generateTaxReportTool() {
        return (request) -> {
            log.info("MCP Tool Called: generateTaxReport for {} (Month: {}/{})", request.donorEmail(), request.year(), request.month());
            try {
                User donor = userRepository.findByEmail(request.donorEmail())
                        .orElseThrow(() -> new RuntimeException("Donor not found"));

                YearMonth ym = YearMonth.of(request.year(), request.month());
                TaxReport report = taxReportService.generateReport(donor, ym);

                if (report == null) {
                    return new TaxReportResult(false, "No completed donations found for this period, or report already generated.", null, null);
                }

                // In a real app this would map to a secure download proxy, but for simplicity here's an internal endpoint simulation
                String downloadUrl = "http://localhost:8080/api/reports/download?path=" + report.getFilePath().replace("\\", "/");
                return new TaxReportResult(true, "Tax report generated successfully.", report.getFilePath(), downloadUrl);
            } catch (Exception e) {
                log.error("Error in generateTaxReport tool: {}", e.getMessage());
                return new TaxReportResult(false, "Failed to generate report: " + e.getMessage(), null, null);
            }
        };
    }
}
