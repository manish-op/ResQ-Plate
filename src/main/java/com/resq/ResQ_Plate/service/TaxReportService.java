package com.resq.ResQ_Plate.service;

import com.resq.ResQ_Plate.entity.Donation;
import com.resq.ResQ_Plate.entity.TaxReport;
import com.resq.ResQ_Plate.entity.User;
import com.resq.ResQ_Plate.repository.DonationRepository;
import com.resq.ResQ_Plate.repository.TaxReportRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.apache.poi.ss.usermodel.*;
import org.apache.poi.ss.util.CellRangeAddress;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.io.FileOutputStream;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.time.LocalDateTime;
import java.time.YearMonth;
import java.util.List;

@Service
@RequiredArgsConstructor
@Slf4j
public class TaxReportService {

    private final DonationRepository donationRepository;
    private final TaxReportRepository taxReportRepository;
    private final EmailService emailService;

    @Value("${resq.reports.dir}")
    private String reportsDir;

    /**
     * Generates an Excel tax deduction report for a donor for a given month.
     * Skips if no completed donations exist or if a report already exists for that period.
     */
    @Transactional
    public TaxReport generateReport(User donor, YearMonth yearMonth) {
        // Prevent duplicate reports
        if (taxReportRepository.findByDonorAndReportMonth(donor, yearMonth.toString()).isPresent()) {
            log.warn("Report already exists for {} in {}. Skipping.", donor.getEmail(), yearMonth);
            return null;
        }

        LocalDateTime start = yearMonth.atDay(1).atStartOfDay();
        LocalDateTime end   = yearMonth.atEndOfMonth().atTime(23, 59, 59);

        List<Donation> completedDonations = donationRepository
                .findByDonorAndStatusAndCreatedAtBetween(donor, Donation.Status.COMPLETED, start, end);

        if (completedDonations.isEmpty()) {
            log.info("No completed donations for {} in {}. No report generated.", donor.getEmail(), yearMonth);
            return null;
        }

        BigDecimal totalWeight = completedDonations.stream()
                .map(d -> d.getEstimatedWeightKg() != null ? d.getEstimatedWeightKg() : BigDecimal.ZERO)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        BigDecimal totalValue = completedDonations.stream()
                .map(d -> d.getEstimatedValueUsd() != null ? d.getEstimatedValueUsd() : BigDecimal.ZERO)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        String filePath = buildExcelReport(donor, yearMonth, completedDonations, totalWeight, totalValue);

        TaxReport report = TaxReport.builder()
                .donor(donor)
                .reportMonth(yearMonth.toString())
                .totalDonations(completedDonations.size())
                .totalWeightKg(totalWeight.setScale(2, RoundingMode.HALF_UP))
                .totalEstimatedValue(totalValue.setScale(2, RoundingMode.HALF_UP))
                .filePath(filePath)
                .build();

        report = taxReportRepository.save(report);

        // Send by email
        try {
            emailService.sendTaxReport(donor.getEmail(), donor.getName(), yearMonth, filePath);
            report.setEmailedAt(LocalDateTime.now());
            taxReportRepository.save(report);
        } catch (Exception e) {
            log.error("Could not email report to {}: {}", donor.getEmail(), e.getMessage());
        }

        log.info("Tax report generated for {} — {} donations, ${} total value",
                donor.getEmail(), completedDonations.size(), totalValue);
        return report;
    }

    // ─────────────────────────────────────────────────────────────────
    // Apache POI Excel Builder
    // ─────────────────────────────────────────────────────────────────

    private String buildExcelReport(User donor, YearMonth yearMonth,
                                    List<Donation> donations,
                                    BigDecimal totalWeight, BigDecimal totalValue) {
        try (Workbook workbook = new XSSFWorkbook()) {

            buildSummarySheet(workbook, donor, yearMonth, donations, totalWeight, totalValue);
            buildTaxSummarySheet(workbook, donor, yearMonth, donations.size(), totalWeight, totalValue);

            String filePath = saveWorkbook(workbook, donor, yearMonth);
            log.info("Excel saved to: {}", filePath);
            return filePath;

        } catch (Exception e) {
            log.error("Excel generation failed for {}: {}", donor.getEmail(), e.getMessage(), e);
            throw new RuntimeException("Report generation failed: " + e.getMessage(), e);
        }
    }

    private void buildSummarySheet(Workbook wb, User donor, YearMonth yearMonth,
                                   List<Donation> donations,
                                   BigDecimal totalWeight, BigDecimal totalValue) {
        Sheet sheet = wb.createSheet("Donation Summary");

        // ── Styles ────────────────────────────────────────────────────
        CellStyle titleStyle = createTitleStyle(wb);
        CellStyle headerStyle = createHeaderStyle(wb);
        CellStyle totalStyle = createTotalStyle(wb);
        CellStyle normalStyle = createNormalStyle(wb);

        // ── Title block ───────────────────────────────────────────────
        Row r0 = sheet.createRow(0);
        Cell titleCell = r0.createCell(0);
        titleCell.setCellValue("🌿 ResQ Plate — Donation Tax Report");
        titleCell.setCellStyle(titleStyle);
        sheet.addMergedRegion(new CellRangeAddress(0, 0, 0, 5));

        createLabelRow(sheet, 1, "Period:", yearMonth.toString(), normalStyle);
        createLabelRow(sheet, 2, "Donor:", donor.getName() +
                (donor.getOrganizationName() != null ? " (" + donor.getOrganizationName() + ")" : ""), normalStyle);
        createLabelRow(sheet, 3, "Email:", donor.getEmail(), normalStyle);
        createLabelRow(sheet, 4, "Address:", donor.getAddress() != null ? donor.getAddress() : "N/A", normalStyle);
        sheet.createRow(5); // spacer

        // ── Data header row ────────────────────────────────────────────
        String[] headers = {"Date Created", "Item Description", "Category", "Qty", "Weight (kg)", "Est. Value (USD)"};
        Row headerRow = sheet.createRow(6);
        for (int i = 0; i < headers.length; i++) {
            Cell cell = headerRow.createCell(i);
            cell.setCellValue(headers[i]);
            cell.setCellStyle(headerStyle);
        }

        // ── Data rows ──────────────────────────────────────────────────
        int rowNum = 7;
        for (Donation d : donations) {
            Row row = sheet.createRow(rowNum++);
            row.createCell(0).setCellValue(d.getCreatedAt() != null ? d.getCreatedAt().toLocalDate().toString() : "");
            row.createCell(1).setCellValue(d.getItemDescription() != null ? d.getItemDescription() : "");
            row.createCell(2).setCellValue(d.getCategory() != null ? d.getCategory().name() : "OTHER");
            row.createCell(3).setCellValue(d.getQuantity() != null ? d.getQuantity() : 0);
            row.createCell(4).setCellValue(d.getEstimatedWeightKg() != null ? d.getEstimatedWeightKg().doubleValue() : 0.0);
            row.createCell(5).setCellValue(d.getEstimatedValueUsd() != null ? d.getEstimatedValueUsd().doubleValue() : 0.0);
        }

        // ── Totals row ─────────────────────────────────────────────────
        Row totalsRow = sheet.createRow(rowNum);
        Cell totalLabel = totalsRow.createCell(0);
        totalLabel.setCellValue("TOTALS");
        totalLabel.setCellStyle(totalStyle);
        for (int i = 1; i <= 2; i++) { Cell c = totalsRow.createCell(i); c.setCellStyle(totalStyle); }

        Cell totalQty = totalsRow.createCell(3);
        totalQty.setCellFormula("SUM(D8:D" + rowNum + ")");
        totalQty.setCellStyle(totalStyle);

        Cell totalWt = totalsRow.createCell(4);
        totalWt.setCellValue(totalWeight.doubleValue());
        totalWt.setCellStyle(totalStyle);

        Cell totalVal = totalsRow.createCell(5);
        totalVal.setCellValue(totalValue.doubleValue());
        totalVal.setCellStyle(totalStyle);

        // Auto-size columns
        for (int i = 0; i < headers.length; i++) sheet.autoSizeColumn(i);
        sheet.setColumnWidth(1, 10000); // Description column wider
    }

    private void buildTaxSummarySheet(Workbook wb, User donor, YearMonth yearMonth,
                                      int count, BigDecimal totalWeight, BigDecimal totalValue) {
        Sheet sheet = wb.createSheet("Tax Summary");
        CellStyle labelStyle = createTotalStyle(wb);
        CellStyle normalStyle = createNormalStyle(wb);

        String[][] data = {
                {"Organization",               donor.getOrganizationName() != null ? donor.getOrganizationName() : donor.getName()},
                {"Contact Email",              donor.getEmail()},
                {"Address",                    donor.getAddress() != null ? donor.getAddress() : "N/A"},
                {"Report Period",              yearMonth.toString()},
                {"Total Donations Completed",  String.valueOf(count)},
                {"Total Weight Donated (kg)",  totalWeight.setScale(2, RoundingMode.HALF_UP).toString()},
                {"Total Estimated Value (USD)","$" + totalValue.setScale(2, RoundingMode.HALF_UP)},
                {"",                           ""},
                {"Note",                       "This document may be submitted for food donation tax deductions per local regulations."}
        };

        for (int i = 0; i < data.length; i++) {
            Row row = sheet.createRow(i);
            Cell label = row.createCell(0);
            label.setCellValue(data[i][0]);
            label.setCellStyle(labelStyle);
            Cell value = row.createCell(1);
            value.setCellValue(data[i][1]);
            value.setCellStyle(normalStyle);
        }

        sheet.autoSizeColumn(0);
        sheet.setColumnWidth(1, 12000);
    }

    // ─── Style Helpers ─────────────────────────────────────────────────────────

    private CellStyle createTitleStyle(Workbook wb) {
        CellStyle style = wb.createCellStyle();
        Font font = wb.createFont();
        font.setBold(true);
        font.setFontHeightInPoints((short) 16);
        style.setFont(font);
        return style;
    }

    private CellStyle createHeaderStyle(Workbook wb) {
        CellStyle style = wb.createCellStyle();
        style.setFillForegroundColor(IndexedColors.DARK_GREEN.getIndex());
        style.setFillPattern(FillPatternType.SOLID_FOREGROUND);
        style.setBorderBottom(BorderStyle.THIN);
        style.setBorderTop(BorderStyle.THIN);
        style.setBorderLeft(BorderStyle.THIN);
        style.setBorderRight(BorderStyle.THIN);
        Font font = wb.createFont();
        font.setBold(true);
        font.setColor(IndexedColors.WHITE.getIndex());
        style.setFont(font);
        return style;
    }

    private CellStyle createTotalStyle(Workbook wb) {
        CellStyle style = wb.createCellStyle();
        style.setFillForegroundColor(IndexedColors.LIGHT_GREEN.getIndex());
        style.setFillPattern(FillPatternType.SOLID_FOREGROUND);
        Font font = wb.createFont();
        font.setBold(true);
        style.setFont(font);
        return style;
    }

    private CellStyle createNormalStyle(Workbook wb) {
        return wb.createCellStyle();
    }

    private void createLabelRow(Sheet sheet, int rowNum, String label, String value, CellStyle style) {
        Row row = sheet.createRow(rowNum);
        row.createCell(0).setCellValue(label);
        row.createCell(1).setCellValue(value);
    }

    private String saveWorkbook(Workbook workbook, User donor, YearMonth yearMonth) throws Exception {
        String dirPath = reportsDir + "/" + yearMonth.getYear() + "/" + yearMonth.getMonthValue();
        Path dir = Paths.get(dirPath);
        Files.createDirectories(dir);

        String filename = dirPath + "/" + donor.getId() + "_" + yearMonth + ".xlsx";
        try (FileOutputStream fos = new FileOutputStream(filename)) {
            workbook.write(fos);
        }
        return filename;
    }
}
