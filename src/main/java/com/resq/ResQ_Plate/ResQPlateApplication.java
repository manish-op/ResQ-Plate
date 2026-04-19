package com.resq.ResQ_Plate;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableScheduling;

@SpringBootApplication
@EnableScheduling  // Enables the @Scheduled monthly report job
public class ResQPlateApplication {

    public static void main(String[] args) {
        SpringApplication.run(ResQPlateApplication.class, args);
    }
}
