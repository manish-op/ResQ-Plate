package com.resq.ResQ_Plate.scheduler;

import com.resq.ResQ_Plate.entity.User;
import com.resq.ResQ_Plate.repository.UserRepository;
import com.resq.ResQ_Plate.service.TaxReportService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import java.time.YearMonth;
import java.util.List;

@Component
@RequiredArgsConstructor
@Slf4j
public class MonthlyReportScheduler {

    private final UserRepository userRepository;
    private final TaxReportService taxReportService;

    /**
     * Runs at 01:00 AM on the 1st of every month.
     * Generates and emails tax deduction reports for ALL donors
     * covering the PREVIOUS month's completed donations.
     *
     * Cron: "0 0 1 1 * *"
     *   ┌──── second (0)
     *   │ ┌──── minute (0)
     *   │ │ ┌──── hour (1 = 1:00 AM)
     *   │ │ │ ┌──── day-of-month (1 = 1st)
     *   │ │ │ │ ┌──── month (* = every)
     *   │ │ │ │ │ ┌──── day-of-week (* = any)
     */
    @Scheduled(cron = "0 0 1 1 * *")
    public void generateMonthlyTaxReports() {
        YearMonth lastMonth = YearMonth.now().minusMonths(1);
        log.info("═══ Monthly Tax Report Job START — Period: {} ═══", lastMonth);

        List<User> donors = userRepository.findByRole(User.Role.DONOR);
        log.info("Found {} donor(s) to process", donors.size());

        int success = 0, skipped = 0, failed = 0;

        for (User donor : donors) {
            try {
                var report = taxReportService.generateReport(donor, lastMonth);
                if (report != null) {
                    success++;
                } else {
                    skipped++;
                }
            } catch (Exception e) {
                failed++;
                log.error("Failed to generate report for donor [{}]: {}", donor.getEmail(), e.getMessage());
            }
        }

        log.info("═══ Monthly Tax Report Job END — Success: {}, Skipped: {}, Failed: {} ═══",
                success, skipped, failed);
    }
}
