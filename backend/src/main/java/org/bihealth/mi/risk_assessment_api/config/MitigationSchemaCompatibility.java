package org.bihealth.mi.risk_assessment_api.config;

import java.util.Arrays;
import java.util.List;
import java.util.stream.Collectors;

import org.bihealth.mi.risk_assessment_api.enums.MitigationResultingDataForm;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.CommandLineRunner;
import org.springframework.core.annotation.Order;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;

/**
 * Repairs small schema differences from earlier mitigation-catalogue milestones.
 *
 * <p>The project currently relies on Hibernate schema management rather than a migration
 * framework. Hibernate update mode does not reliably drop an old NOT NULL constraint, but
 * dataset question mappings legitimately leave projectedOptionCode empty because proposed
 * data transformations are not verified questionnaire changes. It also does not widen the
 * CHECK constraint Hibernate generated for an enum column when a new enum value is added.</p>
 */
@Order(4)
@Component
public class MitigationSchemaCompatibility implements CommandLineRunner {

    private static final Logger log = LoggerFactory.getLogger(MitigationSchemaCompatibility.class);

    private final JdbcTemplate jdbcTemplate;

    public MitigationSchemaCompatibility(JdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
    }

    @Override
    public void run(String... args) {
        List<String> nullability = jdbcTemplate.queryForList("""
                select is_nullable
                from information_schema.columns
                where table_schema = current_schema()
                  and table_name = 'mitigation_question_mappings'
                  and column_name = 'projected_option_code'
                """, String.class);

        if (!nullability.isEmpty() && "NO".equalsIgnoreCase(nullability.get(0))) {
            jdbcTemplate.execute("""
                    alter table mitigation_question_mappings
                    alter column projected_option_code drop not null
                    """);
            log.info("Updated mitigation_question_mappings.projected_option_code to allow dataset mappings without projected answers.");
        }

        alignEnumCheckConstraint("mitigation_actions", "resulting_data_form",
                Arrays.stream(MitigationResultingDataForm.values()).map(Enum::name).collect(Collectors.toList()));
    }

    /**
     * Recreates the Hibernate-generated CHECK constraint of an enum column when it does not accept
     * every current enum value. Values come from the Java enum, which is authoritative.
     */
    private void alignEnumCheckConstraint(String table, String column, List<String> values) {
        String constraint = table + "_" + column + "_check";
        List<String> definitions = jdbcTemplate.queryForList("""
                select pg_get_constraintdef(c.oid)
                from pg_constraint c
                join pg_class t on t.oid = c.conrelid
                join pg_namespace n on n.oid = t.relnamespace
                where n.nspname = current_schema()
                  and t.relname = ?
                  and c.conname = ?
                """, String.class, table, constraint);
        if (definitions.isEmpty()
                || values.stream().allMatch(value -> definitions.get(0).contains("'" + value + "'"))) {
            return;
        }
        String allowed = values.stream().map(value -> "'" + value + "'").collect(Collectors.joining(", "));
        jdbcTemplate.execute("alter table " + table + " drop constraint " + constraint);
        jdbcTemplate.execute("alter table " + table + " add constraint " + constraint
                + " check (" + column + " in (" + allowed + "))");
        log.info("Updated {} to accept {}.", constraint, values);
    }
}
