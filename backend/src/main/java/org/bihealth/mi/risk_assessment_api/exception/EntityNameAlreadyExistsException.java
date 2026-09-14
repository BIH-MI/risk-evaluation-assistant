package org.bihealth.mi.risk_assessment_api.exception;

public class EntityNameAlreadyExistsException extends RuntimeException {

    public static final String CODE = "ENTITY_NAME_ALREADY_EXISTS";

    private final String code;
    private final String resourceLabel;
    private final String entityName;

    public EntityNameAlreadyExistsException(String resourceLabel, String entityName) {
        this(CODE, resourceLabel, entityName);
    }

    protected EntityNameAlreadyExistsException(String code, String resourceLabel, String entityName) {
        super(messageForName(resourceLabel, entityName));
        this.code = code;
        this.resourceLabel = resourceLabel;
        this.entityName = entityName;
    }

    public String getCode() {
        return code;
    }

    public String getResourceLabel() {
        return resourceLabel;
    }

    public String getEntityName() {
        return entityName;
    }

    public static String messageForName(String resourceLabel, String entityName) {
        return articleFor(resourceLabel) + " " + resourceLabel + " with the name \"" + entityName + "\" already exists.";
    }

    public static String messageForUnknownName(String resourceLabel) {
        return articleFor(resourceLabel) + " " + resourceLabel + " with this name already exists.";
    }

    private static String articleFor(String resourceLabel) {
        if (resourceLabel == null || resourceLabel.isEmpty()) {
            return "A";
        }
        char first = Character.toLowerCase(resourceLabel.charAt(0));
        return first == 'a' || first == 'e' || first == 'i' || first == 'o' || first == 'u'
                ? "An"
                : "A";
    }
}
