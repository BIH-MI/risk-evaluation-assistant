<#macro registrationLayout displayMessage=true>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Risk Evaluation Assistant</title>
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Roboto:wght@300;400;500;700&display=swap" rel="stylesheet">
    <#if properties.styles?has_content>
        <#list properties.styles?split(' ') as style>
            <link href="${url.resourcesPath}/${style}" rel="stylesheet" />
        </#list>
    </#if>
</head>
<body>
    <#-- MAIN LAYOUT -->
    <div class="rea-layout">
        <div class="rea-card">
            <#-- Logo centred on the card's top edge. Same artwork as the React app's logo
                 (frontend/src/assets/images/favicon.png), scaled down to 320 px -->
            <img class="rea-logo" src="${url.resourcesPath}/img/logo.png" alt="Risk Evaluation Assistant" width="160" height="160">

            <#-- Keycloak System Alerts (Errors, Success) -->
            <#if displayMessage && message?has_content && (message.type != 'warning' || !isAppInitiatedAction??)>
                <div class="rea-alert rea-alert-${message.type}">
                    ${kcSanitize(message.summary)?no_esc}
                </div>
            </#if>

            <#-- Inject Login, Register, or Reset content here -->
            <#nested "form">
        </div>
    </div>
</body>
</html>
</#macro>