package org.bihealth.mi.risk_assessment_api.exception;

import jakarta.persistence.EntityNotFoundException;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * Regression test: a status chosen by a controller must reach the client. The catch-all handler
 * for {@link Exception} used to turn every ResponseStatusException, such as "not found", into 500.
 */
class GlobalExceptionHandlerTest {

    private final MockMvc mockMvc = MockMvcBuilders.standaloneSetup(new FailingController())
            .setControllerAdvice(new GlobalExceptionHandler())
            .build();

    @Test
    void responseStatusExceptionKeepsItsStatusAndReason() throws Exception {
        mockMvc.perform(get("/conflict"))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.message").value("Cannot delete dataset."));
    }

    @Test
    void missingEntityIsNotFound() throws Exception {
        mockMvc.perform(get("/missing"))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.message").value("Activity not found: 5"));
    }

    @Test
    void unexpectedExceptionStaysAnInternalError() throws Exception {
        mockMvc.perform(get("/broken"))
                .andExpect(status().isInternalServerError());
    }

    @RestController
    static class FailingController {

        @GetMapping("/conflict")
        void conflict() {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Cannot delete dataset.");
        }

        @GetMapping("/missing")
        void missing() {
            throw new EntityNotFoundException("Activity not found: 5");
        }

        @GetMapping("/broken")
        void broken() {
            throw new UnsupportedOperationException("internal detail");
        }
    }
}
