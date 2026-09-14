package org.bihealth.mi.risk_assessment_api.exception;

import jakarta.persistence.EntityNotFoundException;
import org.bihealth.mi.risk_assessment_api.model.NamedResourceConstraints;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.core.NestedExceptionUtils;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.data.crossstore.ChangeSetPersister;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.validation.FieldError;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ControllerAdvice;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.method.annotation.MethodArgumentTypeMismatchException;

import java.util.HashMap;
import java.util.Map;

/**
 * A centralized exception handler for the entire application.
 * This class uses @ControllerAdvice to intercept exceptions thrown from any controller
 * and formats them into a consistent, user-friendly HTTP response.
 */
@ControllerAdvice
public class GlobalExceptionHandler {

    private static final Logger log = LoggerFactory.getLogger(GlobalExceptionHandler.class);

    /**
     * Handles validation exceptions triggered by @Validated on request DTOs.
     * Returns a 400 Bad Request with a map of field names to error messages.
     */
    @ExceptionHandler(MethodArgumentNotValidException.class)
    @ResponseStatus(HttpStatus.BAD_REQUEST)
    public ResponseEntity<Map<String, String>> handleValidationExceptions(MethodArgumentNotValidException ex) {
        Map<String, String> errors = new HashMap<>();
        ex.getBindingResult().getAllErrors().forEach(error -> {
            String fieldName = ((FieldError) error).getField();
            String errorMessage = error.getDefaultMessage();
            errors.put(fieldName, errorMessage);
        });
        return ResponseEntity.badRequest().body(errors);
    }

    /**
     * Handles IllegalStateException, used when a user tries to modify an
     * entity in a state that does not allow it (e.g. a locked configuration).
     * Returns 409 Conflict.
     */
    @ExceptionHandler(IllegalStateException.class)
    public ResponseEntity<Map<String, String>> handleIllegalStateException(IllegalStateException ex) {
        return ResponseEntity.status(HttpStatus.CONFLICT).body(Map.of("message", ex.getMessage()));
    }

    @ExceptionHandler(EntityNameAlreadyExistsException.class)
    public ResponseEntity<Map<String, String>> handleEntityNameAlreadyExistsException(EntityNameAlreadyExistsException ex) {
        return nameConflict(ex.getCode(), ex.getMessage());
    }

    @ExceptionHandler(IllegalArgumentException.class)
    public ResponseEntity<Map<String, String>> handleIllegalArgumentException(IllegalArgumentException ex) {
        return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(Map.of("message", ex.getMessage()));
    }

    @ExceptionHandler(SecurityException.class)
    public ResponseEntity<Map<String, String>> handleSecurityException(SecurityException ex) {
        return ResponseEntity.status(HttpStatus.FORBIDDEN).body(Map.of("message", ex.getMessage()));
    }

    /**
     * Handles EntityNotFoundException, the standard JPA exception when a
     * record is missing. Returns 404 Not Found.
     */
    @ExceptionHandler(EntityNotFoundException.class)
    public ResponseEntity<Map<String, String>> handleEntityNotFound(EntityNotFoundException ex) {
        return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("message", ex.getMessage()));
    }

    /**
     * Handles exceptions for when a requested entity is not found (Spring Data).
     */
    @ExceptionHandler(ChangeSetPersister.NotFoundException.class)
    public ResponseEntity<Map<String, String>> handleNotFoundException(ChangeSetPersister.NotFoundException ex) {
        return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("message", ex.getMessage()));
    }

    @ExceptionHandler(DataIntegrityViolationException.class)
    public ResponseEntity<Map<String, String>> handleDataIntegrityViolationException(DataIntegrityViolationException ex) {
        NamedResourceConstraints.ConstraintMatch match = findNamedResourceConstraint(ex);
        if (match != null) {
            return nameConflict(
                    match.code(),
                    EntityNameAlreadyExistsException.messageForUnknownName(match.resourceLabel())
            );
        }
        return ResponseEntity.status(HttpStatus.CONFLICT).body(Map.of("message", "Database error: " + ex.getMessage()));
    }

    @ExceptionHandler(MethodArgumentTypeMismatchException.class)
    public ResponseEntity<Map<String, String>> handleMethodArgumentTypeMismatchException(MethodArgumentTypeMismatchException ex) {
        return ResponseEntity.badRequest().body(Map.of("message", "Failed to convert path variable: " + ex.getMessage()));
    }

    /**
     * A generic handler for all other un-caught exceptions.
     * Logs the full exception server-side (nothing else in this class does) and
     * returns a generic 500 body, since an arbitrary uncaught exception's own
     * message may contain internal implementation detail that shouldn't reach
     * the client.
     */
    @ExceptionHandler(Exception.class)
    public ResponseEntity<Map<String, String>> handleAllExceptions(Exception ex) {
        log.error("Unhandled exception", ex);
        return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body(Map.of("message", "An unexpected error occurred. Please try again or contact support if the problem persists."));
    }

    private ResponseEntity<Map<String, String>> nameConflict(String code, String message) {
        return ResponseEntity.status(HttpStatus.CONFLICT).body(Map.of(
                "code", code,
                "message", message
        ));
    }

    private NamedResourceConstraints.ConstraintMatch findNamedResourceConstraint(DataIntegrityViolationException ex) {
        Throwable mostSpecificCause = NestedExceptionUtils.getMostSpecificCause(ex);
        String message = mostSpecificCause == null ? ex.getMessage() : mostSpecificCause.getMessage();
        return NamedResourceConstraints.matchViolationMessage(message).orElse(null);
    }
}
