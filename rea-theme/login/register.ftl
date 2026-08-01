<#import "template.ftl" as layout>
<@layout.registrationLayout; section>
    <#if section = "form">
        <h1 class="rea-title" style="margin-bottom: 8px;">Register</h1>
        <div style="font-size: 14px; color: #000; margin-bottom: 24px;">* Required fields</div>
        
        <form id="kc-register-form" action="${url.registrationAction}" method="post">
            <div class="rea-form-group">
                <label for="username" class="rea-label">Username <span class="rea-required">*</span></label>
                <div class="rea-input-container">
                    <input type="text" id="username" class="rea-input" name="username" value="${(register.formData.username!'')}" autocomplete="username" />
                </div>
            </div>

            <div class="rea-form-group">
                <label for="password" class="rea-label">Password <span class="rea-required">*</span></label>
                <div class="rea-input-container">
                    <input type="password" id="password" class="rea-input" name="password" autocomplete="new-password"/>
                    <button type="button" class="rea-icon-button" onclick="togglePassword('password')">
                        <svg viewBox="0 0 24 24"><path d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z"/></svg>
                    </button>
                </div>
            </div>

            <div class="rea-form-group">
                <label for="password-confirm" class="rea-label">Confirm password <span class="rea-required">*</span></label>
                <div class="rea-input-container">
                    <input type="password" id="password-confirm" class="rea-input" name="password-confirm" />
                    <button type="button" class="rea-icon-button" onclick="togglePassword('password-confirm')">
                        <svg viewBox="0 0 24 24"><path d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z"/></svg>
                    </button>
                </div>
            </div>

            <div class="rea-form-group">
                <label for="email" class="rea-label">Email <span class="rea-required">*</span></label>
                <input type="email" id="email" class="rea-input" name="email" value="${(register.formData.email!'')}" autocomplete="email" />
            </div>

            <div class="rea-form-group">
                <label for="firstName" class="rea-label">First name <span class="rea-required">*</span></label>
                <input type="text" id="firstName" class="rea-input" name="firstName" value="${(register.formData.firstName!'')}" />
            </div>

            <div class="rea-form-group">
                <label for="lastName" class="rea-label">Last name <span class="rea-required">*</span></label>
                <input type="text" id="lastName" class="rea-input" name="lastName" value="${(register.formData.lastName!'')}" />
            </div>

            <div class="rea-form-group">
                <button type="submit" class="rea-button rea-button-primary">Register</button>
            </div>

            <div class="rea-divider"></div>
            
            <div class="rea-text-center">
                <a href="${url.loginUrl}" class="rea-link">« Back to Login</a>
            </div>
        </form>

        <script>
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