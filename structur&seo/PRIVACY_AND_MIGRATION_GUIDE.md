# Privacy & Migration Guide: Securing PlayHentai

This guide contains step-by-step instructions on how to secure your identity and migrate your website infrastructure offshore once your traffic grows.

---

## 1. Do I need to do this immediately?
**No.** While your website is new and has low traffic, the risk of legal complications is extremely low. You can safely run on AWS and your current domain registrar for now to build your audience.

Once your site starts getting consistent views (e.g., thousands of daily visitors) or when you begin earning regular ad revenue, you should follow this guide to secure your setup.

---

## 2. Phase 1: Securing the Domain ( playhentai.live )

Since the domain was purchased with a personal card, your registrar holds your real identity details.

### Immediate Action (Do this now):
1. Log in to your domain registrar (where you purchased the domain).
2. Go to your domain settings for `playhentai.live`.
3. Verify that **WHOIS Privacy Protection** (also called PrivacyGuard or WHOIS Privacy) is turned **ON**.
   * *What this does*: It immediately hides your name, email, address, and phone number from public records (replacing them with proxy information).

### Long-term Action (When you migrate):
1. **Choose a Privacy Registrar**: Create a free account on **Njalla** (https://njal.la) or **Porkbun** using a secure, private email.
2. **Transfer Domain**: Once your domain is at least 60 days old (ICANN transfer lockout period), request a domain transfer authorization code (EPP code) from your current registrar and input it on Njalla to initiate the transfer.
3. **Pay with Crypto**: Pay the domain transfer fee using anonymous cryptocurrencies (Bitcoin or Monero).

---

## 3. Phase 2: Migrating the Server ( AWS to Offshore VPS )

AWS is bound by strict US regulations and holds your payment card on file. Migrating to an offshore host hides the location of your server and prevents identity leaks.

### Step-by-Step Server Migration:
1. **Purchase an Offshore VPS**:
   * Choose a provider in a privacy-friendly jurisdiction (e.g., Netherlands, Switzerland, Iceland, or Romania).
   * Recommended providers:
     * **AlexHost** (https://alexhost.com)
     * **Shinjiru** (https://www.shinjiru.com)
     * **FlokiNET** (https://flokinet.is)
   * Order a VPS running **Ubuntu 22.04 LTS** (costs approx. $5 - $10/month).
   * Pay using Crypto (Monero, Bitcoin, or USDT).

2. **Deploy Coolify on the New Server**:
   * Turn on a **VPN** on your PC.
   * Open your terminal and connect to your new VPS server using SSH:
     ```bash
     ssh root@your_new_server_ip
     ```
   * Run the Coolify installer script:
     ```bash
     curl -fsSL https://cdn.coollabs.io/coolify/install.sh | bash
     ```
   * Open your new Coolify dashboard via the URL provided by the installer.

3. **Deploy the Site Code & Database**:
   * Link your GitHub repository in your new Coolify dashboard.
   * Redeploy your Next.js application.
   * Set up a new PostgreSQL (Supabase/Docker) database in Coolify.
   * Restore your database backup into the new database.

4. **Update Cloudflare**:
   * Log in to Cloudflare.
   * Click **DNS** -> **Records**.
   * Update the `A` record for `playhentai.live` and the `media.playhentai.live` record to point to your **new offshore server IP** address.
   * *Make sure the Proxy Status is set to "Proxied" (Orange Cloud)*.

5. **Decommission AWS**:
   * Verify the site is loading correctly from the new server.
   * Terminate your EC2/Lightsail instances on AWS.
   * Close your AWS account.

---

## 4. General Operational Rules (Stay Anonymous)

*   **VPN Usage**: Whenever you are logging into your Coolify panel, Supabase dashboard, or SSH terminal, **always turn on your VPN first** to mask your home IP address.
*   **Encrypted Email**: Use privacy-focused email accounts (like ProtonMail or Tutanota) for all website-related signups.
*   **Financial Separation**: Never receive ad payouts directly into your Indian bank account. Cash out from Exoclick in Crypto (USDT/Bitcoin) to a non-KYC wallet. Only convert crypto to fiat locally/privately when needed.
