package org.bihealth.mi.risk_assessment_api.mitigationplanner.knowledge.validation;

import lombok.Data;

import java.util.ArrayList;
import java.util.List;

@Data
public class KnowledgeBaseValidationResult {

    private boolean valid = true;
    private List<KnowledgeBaseValidationIssue> issues = new ArrayList<>();

    public void add(KnowledgeBaseValidationIssue issue) {
        issues.add(issue);
        if (issue.getSeverity() == KnowledgeBaseValidationIssue.Severity.ERROR) {
            valid = false;
        }
    }
}
