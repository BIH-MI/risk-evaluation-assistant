package org.bihealth.mi.risk_assessment_api.model.qid;

import jakarta.persistence.AttributeConverter;
import jakarta.persistence.Converter;

import java.util.Arrays;
import java.util.List;

/**
 * Stores a short list of identifiers (no commas) as one comma-separated
 * column. null stays null so rows written before the column existed remain
 * distinguishable from an explicitly empty list ("").
 */
@Converter
public class StringListConverter implements AttributeConverter<List<String>, String> {

    @Override
    public String convertToDatabaseColumn(List<String> values) {
        return values == null ? null : String.join(",", values);
    }

    @Override
    public List<String> convertToEntityAttribute(String column) {
        if (column == null) return null;
        if (column.isEmpty()) return List.of();
        return Arrays.stream(column.split(",")).map(String::trim).filter(value -> !value.isEmpty()).toList();
    }
}
