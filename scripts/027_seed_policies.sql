-- ============================================================
-- Her Kingdom - Policies Seed
-- ============================================================
-- Seeds the public.policies table with production-ready content
-- for the three legal pages surfaced on the storefront and
-- managed through the admin panel at /admin/policies:
--
--   1. privacy-policy     -> /privacy-policy
--   2. terms-of-service   -> /terms-of-service
--   3. refund-policy      -> /refund-policy
--
-- Content is stored as HTML (the admin rich-text editor writes
-- HTML and the frontend renders it via dangerouslySetInnerHTML).
-- Copy is tailored for Her Kingdom — a Kenya-based jewelry,
-- watches, fragrance and accessories store that delivers
-- across all 47 counties and accepts M-Pesa and card payments.
--
-- Safe to re-run: uses ON CONFLICT (slug) DO UPDATE so existing
-- rows edited by admins are refreshed to the seeded baseline.
-- ============================================================

BEGIN;

-- ------------------------------------------------------------
-- 1. PRIVACY POLICY
-- ------------------------------------------------------------
INSERT INTO public.policies (slug, title, content, meta_title, meta_description, meta_keywords, is_published)
VALUES (
  'privacy-policy',
  'Privacy Policy',
  $html$
<p>Her Kingdom ("we", "us", "our") is committed to protecting the privacy of every customer who visits our website, places an order, or interacts with our team. This Privacy Policy explains what information we collect, how we use it, and the choices you have. By using herkingdom.co.ke you agree to the practices described below.</p>

<h2>1. Information We Collect</h2>
<p>We only collect the information we need to process your orders, deliver your purchases and improve your shopping experience:</p>
<ul>
  <li><strong>Account details:</strong> your name, email address, phone number and password when you create an account.</li>
  <li><strong>Order details:</strong> delivery address, billing address, items purchased and order history.</li>
  <li><strong>Payment details:</strong> M-Pesa phone number or card details, which are processed securely by our payment partners (Safaricom Daraja and our card processor). We never store full card numbers on our servers.</li>
  <li><strong>Communication:</strong> messages you send us via the contact form, WhatsApp, email or phone.</li>
  <li><strong>Technical data:</strong> IP address, device type, browser, and pages visited, collected through cookies and analytics.</li>
</ul>

<h2>2. How We Use Your Information</h2>
<ul>
  <li>To process orders, arrange delivery across Kenya and issue receipts.</li>
  <li>To send you transactional messages — order confirmations, dispatch notifications and delivery updates — via SMS, email or WhatsApp.</li>
  <li>To provide customer support and respond to enquiries about products, sizing or returns.</li>
  <li>To send marketing communications about new collections, offers and restocks, only where you have opted in. You can unsubscribe at any time.</li>
  <li>To detect fraud, prevent abuse and keep our store secure.</li>
  <li>To comply with Kenyan law, including the Data Protection Act, 2019.</li>
</ul>

<h2>3. Sharing Your Information</h2>
<p>We do not sell your personal data. We share it only with partners who help us run the store:</p>
<ul>
  <li><strong>Delivery partners</strong> (Sendy, G4S, Fargo Courier and in-house riders in Nairobi) who need your name, address and phone number to deliver your order.</li>
  <li><strong>Payment processors</strong> (Safaricom M-Pesa, card acquirers) to complete your transaction.</li>
  <li><strong>Service providers</strong> such as our email, SMS and analytics platforms, under strict confidentiality agreements.</li>
  <li><strong>Regulators or law enforcement</strong> where legally required.</li>
</ul>

<h2>4. Cookies</h2>
<p>We use cookies to keep you signed in, remember your cart, and measure how our store is used. You can disable cookies in your browser settings, but some features of the site may stop working.</p>

<h2>5. Data Retention</h2>
<p>We keep your order and accounting records for at least seven (7) years to comply with Kenya Revenue Authority requirements. Marketing preferences are kept until you unsubscribe. You may request deletion of your account at any time by emailing us.</p>

<h2>6. Your Rights</h2>
<p>Under the Data Protection Act, 2019 you have the right to:</p>
<ul>
  <li>Access the personal data we hold about you.</li>
  <li>Ask us to correct inaccurate information.</li>
  <li>Request deletion of your data (subject to legal retention periods).</li>
  <li>Object to marketing at any time.</li>
  <li>Lodge a complaint with the Office of the Data Protection Commissioner (ODPC).</li>
</ul>

<h2>7. Security</h2>
<p>All traffic to herkingdom.co.ke is encrypted over HTTPS. Passwords are hashed, and payment data is handled through PCI-compliant partners. Despite these measures, no system is 100% secure, so please protect your account password.</p>

<h2>8. Children</h2>
<p>Her Kingdom is intended for customers aged 18 and above. We do not knowingly collect personal data from children.</p>

<h2>9. Changes to this Policy</h2>
<p>We may update this Privacy Policy from time to time. The "Last updated" date at the top of the page will reflect the most recent revision. Material changes will be announced on the website.</p>

<h2>10. Contact Us</h2>
<p>For any privacy-related question or to exercise your rights, please contact our Data Protection Officer:</p>
<ul>
  <li>Email: <a href="mailto:privacy@herkingdom.co.ke">privacy@herkingdom.co.ke</a></li>
  <li>Customer care: see the phone number published on our <a href="/contact">Contact</a> page.</li>
  <li>Postal: Her Kingdom, Nairobi, Kenya.</li>
</ul>
  $html$,
  'Privacy Policy | Her Kingdom',
  'Learn how Her Kingdom collects, uses and protects your personal data when you shop jewelry, watches and accessories online in Kenya.',
  'privacy policy, data protection, Her Kingdom, Kenya privacy, jewelry store privacy, M-Pesa privacy',
  true
)
ON CONFLICT (slug) DO UPDATE SET
  title            = EXCLUDED.title,
  content          = EXCLUDED.content,
  meta_title       = EXCLUDED.meta_title,
  meta_description = EXCLUDED.meta_description,
  meta_keywords    = EXCLUDED.meta_keywords,
  is_published     = EXCLUDED.is_published,
  updated_at       = now();

-- ------------------------------------------------------------
-- 2. TERMS OF SERVICE
-- ------------------------------------------------------------
INSERT INTO public.policies (slug, title, content, meta_title, meta_description, meta_keywords, is_published)
VALUES (
  'terms-of-service',
  'Terms of Service',
  $html$
<p>Welcome to Her Kingdom. These Terms of Service ("Terms") govern your use of herkingdom.co.ke and any purchase you make from us. By browsing the site, creating an account or placing an order, you agree to be bound by these Terms. Please read them carefully.</p>

<h2>1. About Us</h2>
<p>Her Kingdom is an online retailer of jewelry, watches, sunglasses, handbags, fragrances, scarves and gift items, registered and operating in the Republic of Kenya. All prices are quoted in Kenya Shillings (KES) and include VAT where applicable.</p>

<h2>2. Eligibility</h2>
<p>You must be at least 18 years of age, or acting under the supervision of a parent or guardian, to place an order on our store.</p>

<h2>3. Account</h2>
<p>When you create an account you are responsible for keeping your password confidential and for all activity that takes place under it. Notify us immediately if you suspect unauthorised use of your account.</p>

<h2>4. Orders &amp; Pricing</h2>
<ul>
  <li>An order is confirmed only after you receive an order confirmation email or SMS from us.</li>
  <li>We reserve the right to cancel any order if the item is out of stock, if the price was listed in error, or if we suspect fraud. Any amount already paid will be refunded in full.</li>
  <li>Product images are for illustration only. Slight variations in colour and finish may occur with handmade or natural-stone pieces.</li>
</ul>

<h2>5. Payment</h2>
<p>We accept the following payment methods:</p>
<ul>
  <li><strong>M-Pesa</strong> (STK Push or Paybill) — settled instantly.</li>
  <li><strong>Debit and credit cards</strong> (Visa, Mastercard) through our secure card processor.</li>
  <li><strong>Pay on Delivery</strong> within select Nairobi zones, at our discretion.</li>
</ul>
<p>Orders are only dispatched once full payment has been received (except where Pay on Delivery is available).</p>

<h2>6. Delivery</h2>
<p>We deliver across all 47 counties in Kenya through our in-house riders (Nairobi) and courier partners (upcountry). Delivery fees and expected time frames are displayed at checkout based on your location. We are not liable for delays caused by courier partners, weather or other events outside our reasonable control.</p>

<h2>7. Returns, Exchanges &amp; Refunds</h2>
<p>Returns and refunds are governed by our <a href="/refund-policy">Refund Policy</a>, which forms part of these Terms.</p>

<h2>8. Promotions, Gift Cards &amp; Vouchers</h2>
<ul>
  <li>Discount codes cannot be combined unless explicitly stated.</li>
  <li>Gift cards are non-refundable and cannot be exchanged for cash.</li>
  <li>We reserve the right to withdraw or modify any promotion at any time.</li>
</ul>

<h2>9. Intellectual Property</h2>
<p>All content on herkingdom.co.ke — including logos, photography, product descriptions, packaging design and page layouts — is the property of Her Kingdom or its licensors and is protected by copyright and trademark law. You may not copy, reproduce or use our content for commercial purposes without written permission.</p>

<h2>10. Acceptable Use</h2>
<p>You agree not to use the site to:</p>
<ul>
  <li>Place fraudulent or speculative orders.</li>
  <li>Attempt to gain unauthorised access to our systems.</li>
  <li>Upload malware, scrape bulk data or otherwise interfere with the service.</li>
</ul>

<h2>11. Limitation of Liability</h2>
<p>To the maximum extent permitted by Kenyan law, Her Kingdom's total liability arising from any single order is limited to the amount paid for that order. We are not liable for indirect or consequential losses.</p>

<h2>12. Governing Law</h2>
<p>These Terms are governed by the laws of the Republic of Kenya. Any dispute shall be subject to the exclusive jurisdiction of the courts of Nairobi.</p>

<h2>13. Changes</h2>
<p>We may update these Terms from time to time. Continued use of the site after changes are posted constitutes acceptance of the revised Terms.</p>

<h2>14. Contact</h2>
<p>If you have any question about these Terms, contact us at <a href="mailto:support@herkingdom.co.ke">support@herkingdom.co.ke</a> or through the phone number listed on our <a href="/contact">Contact</a> page.</p>
  $html$,
  'Terms of Service | Her Kingdom',
  'Read the Terms of Service that govern shopping at Her Kingdom — orders, payment, delivery and your rights as a customer in Kenya.',
  'terms of service, terms and conditions, Her Kingdom, Kenya terms, jewelry store terms, online shopping Kenya',
  true
)
ON CONFLICT (slug) DO UPDATE SET
  title            = EXCLUDED.title,
  content          = EXCLUDED.content,
  meta_title       = EXCLUDED.meta_title,
  meta_description = EXCLUDED.meta_description,
  meta_keywords    = EXCLUDED.meta_keywords,
  is_published     = EXCLUDED.is_published,
  updated_at       = now();

-- ------------------------------------------------------------
-- 3. REFUND POLICY
-- ------------------------------------------------------------
INSERT INTO public.policies (slug, title, content, meta_title, meta_description, meta_keywords, is_published)
VALUES (
  'refund-policy',
  'Refund Policy',
  $html$
<p>At Her Kingdom we want you to love every piece you receive. If something is not right, this Refund Policy explains when and how we can issue a refund, exchange or store credit.</p>

<h2>1. Return Window</h2>
<p>You may request a return or exchange within <strong>seven (7) days</strong> of the date your order was delivered. Requests received after this window cannot be accepted.</p>

<h2>2. Eligible Items</h2>
<p>To qualify for a return, items must be:</p>
<ul>
  <li>Unworn, unused and in the original condition in which they were received.</li>
  <li>In their original packaging, with all tags, pouches, boxes and care cards intact.</li>
  <li>Accompanied by proof of purchase (order number, receipt or confirmation email).</li>
</ul>

<h2>3. Non-Returnable Items</h2>
<p>For hygiene, customisation and value reasons the following items cannot be returned:</p>
<ul>
  <li>Earrings and any pierced jewelry.</li>
  <li>Fragrances and beauty products once the seal has been broken.</li>
  <li>Gift cards.</li>
  <li>Personalised, engraved or made-to-order pieces.</li>
  <li>Items sold as "Final Sale" or "Clearance".</li>
</ul>

<h2>4. Faulty or Incorrect Items</h2>
<p>If your order arrives damaged, defective or incorrect, contact us within <strong>48 hours</strong> of delivery at <a href="mailto:support@herkingdom.co.ke">support@herkingdom.co.ke</a> with your order number and clear photos of the issue. We will arrange a free replacement or a full refund, including the original delivery fee.</p>

<h2>5. How to Start a Return</h2>
<ol>
  <li>Email <a href="mailto:returns@herkingdom.co.ke">returns@herkingdom.co.ke</a> or WhatsApp our customer-care line within the 7-day window.</li>
  <li>Include your order number, the items you wish to return, and the reason.</li>
  <li>Our team will respond within 24 hours (Mon–Sat) with a Return Authorisation and drop-off or pickup instructions.</li>
  <li>Pack the item securely in its original packaging and ship it back.</li>
</ol>

<h2>6. Return Shipping Costs</h2>
<ul>
  <li>If the return is due to our error (wrong item, damaged, defective) we cover the return shipping.</li>
  <li>For change-of-mind returns, the customer is responsible for return shipping, and the original delivery fee is non-refundable.</li>
</ul>

<h2>7. Refund Methods &amp; Timing</h2>
<p>Once we receive and inspect your return (usually within 2 business days) we will notify you of the outcome. Approved refunds are processed as follows:</p>
<ul>
  <li><strong>M-Pesa:</strong> refunded to the paying number within 1–3 business days.</li>
  <li><strong>Card:</strong> refunded to the original card within 5–10 business days (depending on your bank).</li>
  <li><strong>Store credit / exchange:</strong> issued instantly once the return is approved.</li>
</ul>

<h2>8. Exchanges</h2>
<p>We are happy to exchange items for a different size, colour or style of equal value, subject to availability. If the new item costs more, the balance can be paid via M-Pesa or card; if it costs less, the difference is issued as store credit.</p>

<h2>9. Late or Missing Refunds</h2>
<p>If you have not received your refund within the time frames above, please check with your bank or M-Pesa first, then contact us at <a href="mailto:returns@herkingdom.co.ke">returns@herkingdom.co.ke</a>.</p>

<h2>10. Contact Us</h2>
<p>For any return, exchange or refund question, reach our customer-care team:</p>
<ul>
  <li>Email: <a href="mailto:returns@herkingdom.co.ke">returns@herkingdom.co.ke</a></li>
  <li>Phone &amp; WhatsApp: see the number published on our <a href="/contact">Contact</a> page.</li>
  <li>Hours: Monday – Saturday, 9:00 AM – 6:00 PM (EAT).</li>
</ul>
  $html$,
  'Refund Policy | Her Kingdom',
  'Our Refund Policy — how to return, exchange or refund jewelry, watches and accessories bought from Her Kingdom Kenya within 7 days.',
  'refund policy, returns, exchanges, Her Kingdom, Kenya refund, jewelry returns, M-Pesa refund',
  true
)
ON CONFLICT (slug) DO UPDATE SET
  title            = EXCLUDED.title,
  content          = EXCLUDED.content,
  meta_title       = EXCLUDED.meta_title,
  meta_description = EXCLUDED.meta_description,
  meta_keywords    = EXCLUDED.meta_keywords,
  is_published     = EXCLUDED.is_published,
  updated_at       = now();

COMMIT;

-- ------------------------------------------------------------
-- Verify
-- ------------------------------------------------------------
-- SELECT slug, title, is_published, length(content) AS content_length, updated_at
-- FROM public.policies
-- WHERE slug IN ('privacy-policy', 'terms-of-service', 'refund-policy')
-- ORDER BY slug;
