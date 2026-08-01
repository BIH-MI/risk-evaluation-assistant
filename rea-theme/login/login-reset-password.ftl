<#import "template.ftl" as layout>
<@layout.registrationLayout; section>
    <#if section = "form">
        <h1 class="rea-title">Forgot Your Password?</h1>
        
        <form id="kc-reset-password-form" action="${url.loginAction}" method="post">
            <div class="rea-form-group">
                <label for="username" class="rea-label">Username</label>
                <div class="rea-input-container">
                    <input type="text" id="username" name="username" class="rea-input" autofocus value="${(auth.attemptedUsername!'')}" />
                </div>
            </div>

            <div class="rea-form-group">
                <button type="submit" class="rea-button rea-button-primary">Submit</button>
            </div>
            
            <div class="rea-form-group">
                <a href="${url.loginUrl}" class="rea-button-outlined rea-button" style="text-align: center;">« Back to Login</a>
            </div>
            
            <p style="font-size: 15px; color: #000; line-height: 1.5; margin: 0;">
                Enter your username or email address and we will send you instructions on how to create a new password.
            </p>
        </form>
    </#if>
</@layout.registrationLayout>