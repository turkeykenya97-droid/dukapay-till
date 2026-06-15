import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, Store } from "lucide-react";

export const Route = createFileRoute("/privacy")({
  component: PrivacyPage,
});

function PrivacyPage() {
  return (
    <div className="min-h-screen bg-white">
      {/* Navigation */}
      <nav className="sticky top-0 bg-white/80 backdrop-blur-sm border-b border-slate-200 z-50">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <Store className="h-6 w-6 text-green-600" />
            <span className="font-bold text-lg text-slate-900">Trusit</span>
          </div>
          <Link to="/" className="flex items-center gap-2 text-slate-600 hover:text-slate-900 font-medium">
            <ArrowLeft className="h-5 w-5" />
            Back
          </Link>
        </div>
      </nav>

      {/* Content */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <h1 className="text-4xl font-bold text-slate-900 mb-8">Privacy Policy</h1>
        
        <div className="prose prose-slate max-w-none">
          <div className="space-y-8 text-slate-600">
            <section>
              <h2 className="text-2xl font-bold text-slate-900 mb-4">Privacy Policy</h2>
              <p className="text-sm text-slate-500 mb-8">Last Updated: June 2026</p>
              
              <div className="space-y-8">
                <p className="text-slate-600 leading-relaxed">
                  Grover Agency ("we," "us," or "our") operates Trusit, a point-of-sale and business management platform for merchants in Kenya. This Privacy Policy explains what information we collect, how we use it, and your rights regarding your data, in line with Kenya's Data Protection Act, 2019.
                </p>
                <p className="text-slate-600 leading-relaxed">
                  By using Trusit, you agree to the collection and use of information as described in this policy.
                </p>

                <div>
                  <h3 className="text-lg font-semibold text-slate-900 mb-3">1. Information We Collect</h3>
                  <div className="space-y-4">
                    <div>
                      <h4 className="font-medium text-slate-900 mb-2">Account Information</h4>
                      <p className="text-slate-600 leading-relaxed">
                        When you register, we collect your name, shop name, phone number, password, and a 4-digit security PIN (stored in encrypted form).
                      </p>
                    </div>
                    <div>
                      <h4 className="font-medium text-slate-900 mb-2">Transaction Data</h4>
                      <p className="text-slate-600 leading-relaxed">
                        We record details of sales made through Trusit, including item names, prices, quantities, payment method (M-Pesa or cash), timestamps, and — where applicable — your customers' phone numbers and M-Pesa transaction references.
                      </p>
                    </div>
                    <div>
                      <h4 className="font-medium text-slate-900 mb-2">Product and Inventory Data</h4>
                      <p className="text-slate-600 leading-relaxed">
                        Information about the products you sell, including names, prices, stock levels, and barcodes.
                      </p>
                    </div>
                    <div>
                      <h4 className="font-medium text-slate-900 mb-2">Staff Information</h4>
                      <p className="text-slate-600 leading-relaxed">
                        If you invite staff members, we collect their email addresses and account activity within your shop.
                      </p>
                    </div>
                    <div>
                      <h4 className="font-medium text-slate-900 mb-2">Payment Channel Information</h4>
                      <p className="text-slate-600 leading-relaxed">
                        Your M-Pesa till or paybill number, used to route payments to your business via our payment partner, SmartPay.
                      </p>
                    </div>
                    <div>
                      <h4 className="font-medium text-slate-900 mb-2">Technical Information</h4>
                      <p className="text-slate-600 leading-relaxed">
                        We may automatically collect device information, IP address, and usage data (such as pages visited and features used) to maintain and improve the Service.
                      </p>
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="text-lg font-semibold text-slate-900 mb-3">2. How We Use Your Information</h3>
                  <p className="text-slate-600 leading-relaxed mb-3">
                    We use the information we collect to:
                  </p>
                  <ul className="list-disc list-inside text-slate-600 space-y-2 mb-3">
                    <li>Operate the core features of Trusit, including processing sales, managing inventory, and generating receipts.</li>
                    <li>Facilitate M-Pesa payments through SmartPay, including STK Push requests and QR payment links.</li>
                    <li>Manage your subscription, including billing and renewal reminders.</li>
                    <li>Provide analytics and business insights (Pro plan).</li>
                    <li>Manage staff access and permissions within your shop.</li>
                    <li>Communicate with you about your account, including service updates and support.</li>
                    <li>Improve and maintain the security and performance of the Service.</li>
                  </ul>
                  <p className="text-slate-600 leading-relaxed">
                    We do not use your business or customer data for advertising purposes, and we do not sell your data to third parties.
                  </p>
                </div>

                <div>
                  <h3 className="text-lg font-semibold text-slate-900 mb-3">3. How We Share Your Information</h3>
                  <p className="text-slate-600 leading-relaxed mb-4">
                    We share information only as necessary to operate the Service:
                  </p>
                  <div className="space-y-4">
                    <div>
                      <h4 className="font-medium text-slate-900 mb-2">SmartPay (Payment Processing)</h4>
                      <p className="text-slate-600 leading-relaxed">
                        To process M-Pesa payments, we share transaction details (amount, phone number, reference) with SmartPay, our licensed payment processing partner.
                      </p>
                    </div>
                    <div>
                      <h4 className="font-medium text-slate-900 mb-2">Supabase (Data Storage)</h4>
                      <p className="text-slate-600 leading-relaxed">
                        Your account and business data is stored in a Supabase-hosted database. Supabase acts as our data processor and does not use your data for its own purposes.
                      </p>
                    </div>
                    <div>
                      <h4 className="font-medium text-slate-900 mb-2">Cloudflare (Hosting and Infrastructure)</h4>
                      <p className="text-slate-600 leading-relaxed">
                        Trusit runs on Cloudflare's infrastructure, which may process technical and network-level data as part of delivering the Service.
                      </p>
                    </div>
                    <div>
                      <h4 className="font-medium text-slate-900 mb-2">Legal Requirements</h4>
                      <p className="text-slate-600 leading-relaxed">
                        We may disclose information if required by law, court order, or to comply with a legitimate request from Kenyan regulatory or law enforcement authorities.
                      </p>
                    </div>
                  </div>
                  <p className="text-slate-600 leading-relaxed mt-4">
                    We do not share your customer phone numbers or sales data with other merchants, advertisers, or unrelated third parties.
                  </p>
                </div>

                <div>
                  <h3 className="text-lg font-semibold text-slate-900 mb-3">4. Data Retention</h3>
                  <p className="text-slate-600 leading-relaxed">
                    We retain your account and transaction data for as long as your account is active, and for a reasonable period afterward to comply with legal, accounting, and regulatory obligations (including tax-related record-keeping requirements under Kenyan law).
                  </p>
                  <p className="text-slate-600 leading-relaxed mt-3">
                    If you close your account, we will retain transaction records as required by law but will deactivate your active account access. You may request deletion of personal data that we are not legally required to retain.
                  </p>
                </div>

                <div>
                  <h3 className="text-lg font-semibold text-slate-900 mb-3">5. Your Rights</h3>
                  <p className="text-slate-600 leading-relaxed mb-3">
                    Under the Data Protection Act, 2019, you have the right to:
                  </p>
                  <ul className="list-disc list-inside text-slate-600 space-y-2 mb-3">
                    <li><strong>Access</strong> the personal data we hold about you.</li>
                    <li><strong>Correct</strong> inaccurate or incomplete data.</li>
                    <li><strong>Request deletion</strong> of your personal data, subject to our legal retention obligations.</li>
                    <li><strong>Object to or restrict</strong> certain processing of your data.</li>
                    <li><strong>Data portability</strong> — request your data in a structured, commonly used format.</li>
                  </ul>
                  <p className="text-slate-600 leading-relaxed">
                    To exercise any of these rights, contact us using the details below. We will respond within the timeframes required by Kenyan law.
                  </p>
                </div>

                <div>
                  <h3 className="text-lg font-semibold text-slate-900 mb-3">6. Security Measures</h3>
                  <p className="text-slate-600 leading-relaxed mb-3">
                    We take reasonable technical and organizational measures to protect your data, including:
                  </p>
                  <ul className="list-disc list-inside text-slate-600 space-y-2 mb-3">
                    <li>Encryption of passwords and PINs using industry-standard hashing.</li>
                    <li>Role-based access controls, so staff accounts can only access data relevant to their role.</li>
                    <li>Row-level security on our database to ensure each shop's data is isolated from others.</li>
                    <li>Secure, encrypted connections (HTTPS) for all data transmitted to and from the Service.</li>
                  </ul>
                  <p className="text-slate-600 leading-relaxed">
                    While we work to protect your information, no system is completely secure, and we cannot guarantee absolute security of data transmitted over the internet.
                  </p>
                </div>

                <div>
                  <h3 className="text-lg font-semibold text-slate-900 mb-3">7. Children's Privacy</h3>
                  <p className="text-slate-600 leading-relaxed">
                    Trusit is intended for business use by adults. We do not knowingly collect personal information from individuals under 18 years of age.
                  </p>
                </div>

                <div>
                  <h3 className="text-lg font-semibold text-slate-900 mb-3">8. Changes to This Policy</h3>
                  <p className="text-slate-600 leading-relaxed">
                    We may update this Privacy Policy from time to time to reflect changes in our practices or legal requirements. We will notify you of material changes through the Service or via the contact details on your account.
                  </p>
                </div>

                <div>
                  <h3 className="text-lg font-semibold text-slate-900 mb-3">9. Contact Us</h3>
                  <p className="text-slate-600 leading-relaxed mb-4">
                    If you have questions about this Privacy Policy or wish to exercise your data rights, contact us at:
                  </p>
                  <div className="bg-slate-50 p-4 rounded-lg mb-4 text-slate-600">
                    <p className="font-semibold mb-2">Grover Agency</p>
                    <p>Email: support@trusit.app</p>
                    <p>Phone: 0743053511</p>
                  </div>
                  <p className="text-slate-600 leading-relaxed">
                    If you believe your data protection rights have been violated, you may also lodge a complaint with the <strong>Office of the Data Protection Commissioner (ODPC)</strong>, Kenya.
                  </p>
                </div>
              </div>
            </section>

            <section className="border-t border-slate-200 pt-8 mt-8">
              <p className="text-sm text-slate-500">
                Last updated: June 2026
              </p>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}
