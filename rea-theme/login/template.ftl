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
    <#-- BACKGROUND VIDEO & OVERLAY -->
    <video autoplay loop muted playsinline class="rea-video-bg">
        <source src="${url.resourcesPath}/vid/background.mp4" type="video/mp4">
    </video>
    <div class="rea-video-overlay"></div>

    <#-- MAIN LAYOUT -->
    <div class="rea-layout">
        <div class="rea-header">RISK EVALUATION ASSISTANT</div>
        
        <div class="rea-card">
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