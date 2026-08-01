<#import "template.ftl" as layout>
<@layout.registrationLayout; section>
    <#if section = "form">
        <h1 class="rea-title">Sign in to your account</h1>
        
        <form id="kc-form-login" onsubmit="login.disabled = true; return true;" action="${url.loginAction}" method="post">
            <div class="rea-form-group">
                <label for="username" class="rea-label">Username</label>
                <div class="rea-input-container">
                    <input id="username" class="rea-input" name="username" value="${(login.username!'')}" type="text" autofocus autocomplete="off" />
                </div>
            </div>

            <div class="rea-form-group">
                <label for="password" class="rea-label">Password</label>
                <div class="rea-input-container">
                    <input id="password" class="rea-input" name="password" type="password" autocomplete="off" />
                    <button type="button" class="rea-icon-button" onclick="togglePassword('password')">
                        <svg viewBox="0 0 24 24"><path d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z"/></svg>
                    </button>
                </div>
                <#if realm.resetPasswordAllowed>
                    <div style="margin-top: 8px;">
                        <a href="${url.loginResetCredentialsUrl}" class="rea-link">Forgot Password?</a>
                    </div>
                </#if>
            </div>

            <#if realm.rememberMe && !usernameHidden??>
                <div class="rea-checkbox-container">
                    <input id="rememberMe" name="rememberMe" type="checkbox" <#if login.rememberMe??>checked</#if>>
                    <label for="rememberMe">Remember me</label>
                </div>
            </#if>

            <div class="rea-form-group">
                <button type="submit" class="rea-button rea-button-primary" name="login">Sign In</button>
            </div>
        </form>

        <#if realm.password && realm.registrationAllowed && !registrationDisabled??>
            <div class="rea-text-center" style="margin-top: 24px;">
                <span style="color: #000; font-size: 14px;">New user? </span><a href="${url.registrationUrl}" class="rea-link">Register</a>
            </div>
        </#if>

        <script>
            // Pure JS implementation of Material-UI password toggle (SVG swap)
            function togglePassword(id) {
                var input = document.getElementById(id);
                var btn = input.nextElementSibling;
                if (input.type === "password") {
                    input.type = "text";
                    btn.innerHTML = '<svg viewBox="0 0 24 24"><path d="M12 7c2.76 0 5 2.24 5 5 0 .65-.13 1.26-.36 1.83l2.92 2.92c1.51-1.26 2.7-2.89 3.43-4.75-1.73-4.39-6-7.5-11-7.5-1.4 0-2.74.25-3.98.7l2.16 2.16C10.74 7.13 11.35 7 12 7zM2 4.27l2.28 2.28.46.46C3.08 8.3 1.78 10.02 1 12c1.73 4.39 6 7.5 11 7.5 1.55 0 3.03-.3 4.38-.84l.42.42L19.73 22 21 20.73 3.27 3 2 4.27zM7.53 9.8l1.55 1.55c-.05.21-.08.43-.08.65 0 1.66 1.34 3 3 3 .22 0 .44-.03.65-.08l1.55 1.55c-.67.33-1.41.53-2.2.53-2.76 0-5-2.24-5-5 0-.79.2-1.53.53-2.2zm4.31-.78l3.15 3.15.02-.16c0-1.66-1.34-3-3-3l-.17.01z"/></svg>';
                } else {
                    input.type = "password";
                    btn.innerHTML = '<svg viewBox="0 0 24 24"><path d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z"/></svg>';
                }
            }
        </script>
    </#if>
</@layout.registrationLayout>