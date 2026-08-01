<#import "template.ftl" as layout>
<@layout.registrationLayout; section>
    <#if section = "form">
        <h1 class="rea-title">Log out</h1>
        <p style="margin-bottom: 24px; font-size: 16px; color: #000;">Are you sure you want to log out?</p>
        
        <form id="kc-logout-confirm-form" action="${url.logoutConfirmAction}" method="POST">
            <input type="hidden" name="session_code" value="${logoutConfirm.code}">
            
            <div class="rea-form-group">
                <button type="submit" class="rea-button rea-button-primary" name="confirmLogout" id="kc-logout">Sign Out</button>
            </div>
            <div class="rea-form-group">
                <a href="${client.baseUrl!url.loginUrl}" class="rea-button-outlined rea-button" style="text-align: center;">Cancel</a>
            </div>
        </form>
    </#if>
</@layout.registrationLayout>