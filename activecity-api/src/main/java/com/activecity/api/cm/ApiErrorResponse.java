package com.activecity.api.cm;

/**
 * Single error-throwing mechanism for all services.
 *
 * <p>Extends {@link RuntimeException} so it can be thrown directly from any layer.
 * Controllers catch it via {@code @ExceptionHandler} and convert to an HTTP response.</p>
 */
public class ApiErrorResponse extends RuntimeException {

    private final int status;
    private final String code;

    public ApiErrorResponse(int status, String code, String message) {
        super(message);
        this.status = status;
        this.code = code;
    }

    public int getStatus() {
        return status;
    }

    public String getCode() {
        return code;
    }
}
