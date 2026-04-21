package com.resq.ResQ_Plate.exception;

import org.springframework.http.HttpStatus;
import lombok.Getter;

@Getter
public class ResQException extends RuntimeException {
    private final HttpStatus status;

    public ResQException(String message) {
        super(message);
        this.status = HttpStatus.BAD_REQUEST;
    }

    public ResQException(String message, HttpStatus status) {
        super(message);
        this.status = status;
    }
}
