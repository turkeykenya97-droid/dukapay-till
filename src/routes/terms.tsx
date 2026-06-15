import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, Store } from "lucide-react";

export const Route = createFileRoute("/terms")({
  component: TermsPage,
});

function TermsPage() {
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
        <h1 className="text-4xl font-bold text-slate-900 mb-8">Terms of Use</h1>
        
        <div className="prose prose-slate max-w-none">
          <div className="space-y-8 text-slate-600">
            <section>
              <h2 className="text-2xl font-bold text-slate-900 mb-4">Terms of Use</h2>
              <p className="text-sm text-slate-500 mb-8">Last Updated: June 2026</p>
              
              <div className="space-y-8">
                <p className="text-slate-600 leading-relaxed">
                  Welcome to Trusit. These Terms of Use ("Terms") govern your access to and use of the Trusit platform, including our website, mobile applications, and related services (collectively, the "Service"), operated by Grover Agency ("we," "us," or "our").
                </p>
                <p className="text-slate-600 leading-relaxed">
                  By creating an account or using Trusit, you agree to these Terms. If you do not agree, please do not use the Service.
                </p>

                <div>
                  <h3 className="text-lg font-semibold text-slate-900 mb-3">1. Account Registration</h3>
                  <p className="text-slate-600 leading-relaxed">
                    To use Trusit, you must create an account by providing accurate information, including your name, shop name, phone number, and a security PIN. You are responsible for keeping your login credentials and PIN confidential. You must notify us promptly if you suspect unauthorized access to your account.
                  </p>
                  <p className="text-slate-600 leading-relaxed mt-3">
                    If you sign up as a shop owner, you are responsible for the accounts and activity of any staff members you invite to your shop. You must be at least 18 years old to create an account.
                  </p>
                </div>

                <div>
                  <h3 className="text-lg font-semibold text-slate-900 mb-3">2. Subscription Plans and Billing</h3>
                  <p className="text-slate-600 leading-relaxed">
                    Trusit offers a 14-day free trial, after which continued use requires a paid subscription:
                  </p>
                  <ul className="list-disc list-inside text-slate-600 mt-3 mb-3 space-y-2">
                    <li><strong>Basic Plan</strong> — KES 299 per month</li>
                    <li><strong>Pro Plan</strong> — KES 499 per month</li>
                  </ul>
                  <p className="text-slate-600 leading-relaxed">
                    Subscription fees are billed in advance for a 30-day period from the date of payment. Payments are processed via M-Pesa through our payment partner, SmartPay.
                  </p>
                  <p className="text-slate-600 leading-relaxed mt-3">
                    If your subscription expires without renewal, your account will be locked and you will be unable to record sales, accept payments, or access most features until you renew. Your historical data is retained and will be accessible again once you renew.
                  </p>
                  <p className="text-slate-600 leading-relaxed mt-3">
                    Plan changes (upgrading from Basic to Pro) take effect at the start of your next billing cycle. We do not offer prorated refunds for mid-cycle plan changes or cancellations.
                  </p>
                </div>

                <div>
                  <h3 className="text-lg font-semibold text-slate-900 mb-3">3. Payment Processing</h3>
                  <p className="text-slate-600 leading-relaxed">
                    Trusit integrates with SmartPay to facilitate M-Pesa payments, including STK Push requests, QR payment links, and subscription billing. By using these features, you acknowledge that:
                  </p>
                  <ul className="list-disc list-inside text-slate-600 mt-3 space-y-2">
                    <li>SmartPay processes the actual transfer of funds; Trusit does not hold or custody your money.</li>
                    <li>Once your till or paybill number is registered during setup, it cannot be changed through the platform. To update your payment destination, contact our support team.</li>
                    <li>We are not responsible for delays, failures, or errors caused by SmartPay, Safaricom, or M-Pesa systems that are outside our control.</li>
                  </ul>
                </div>

                <div>
                  <h3 className="text-lg font-semibold text-slate-900 mb-3">4. Acceptable Use</h3>
                  <p className="text-slate-600 leading-relaxed">
                    You agree to use Trusit only for lawful business purposes. You may not:
                  </p>
                  <ul className="list-disc list-inside text-slate-600 mt-3 space-y-2">
                    <li>Use the Service to facilitate fraud, money laundering, or any illegal transactions.</li>
                    <li>Attempt to access another merchant's shop data, accounts, or sales records without authorization.</li>
                    <li>Reverse-engineer, copy, or resell the Service or its underlying technology.</li>
                    <li>Use automated tools to access the Service in a way that could disrupt or overload our systems.</li>
                    <li>Share your account, PIN, or staff invitations with anyone outside your business.</li>
                  </ul>
                  <p className="text-slate-600 leading-relaxed mt-3">
                    We reserve the right to suspend or terminate accounts that violate these terms.
                  </p>
                </div>

                <div>
                  <h3 className="text-lg font-semibold text-slate-900 mb-3">5. Staff Accounts and Roles</h3>
                  <p className="text-slate-600 leading-relaxed">
                    Shop owners may invite staff members to access Trusit under their shop. Staff accounts have limited permissions and cannot access subscription settings, modify inventory pricing, or remove other staff. The shop owner is responsible for managing staff access and ensuring staff comply with these Terms.
                  </p>
                  <p className="text-slate-600 leading-relaxed mt-3">
                    Owners may revoke staff access at any time. We are not responsible for disputes between shop owners and their staff regarding account access or data viewed during their employment.
                  </p>
                </div>

                <div>
                  <h3 className="text-lg font-semibold text-slate-900 mb-3">6. Your Data</h3>
                  <p className="text-slate-600 leading-relaxed">
                    You retain ownership of the business data you input into Trusit, including product listings, sales records, customer phone numbers, and transaction history. We do not sell your business data to third parties.
                  </p>
                  <p className="text-slate-600 leading-relaxed mt-3">
                    You are responsible for the accuracy of the information you enter, including prices, stock levels, and customer details. We are not liable for losses resulting from incorrect data entry.
                  </p>
                </div>

                <div>
                  <h3 className="text-lg font-semibold text-slate-900 mb-3">7. Service Availability</h3>
                  <p className="text-slate-600 leading-relaxed">
                    We aim to keep Trusit available and reliable, but we do not guarantee uninterrupted access. The Service may be temporarily unavailable due to maintenance, technical issues, or circumstances beyond our control, including outages affecting SmartPay, Safaricom, Supabase, or Cloudflare infrastructure that Trusit depends on.
                  </p>
                </div>

                <div>
                  <h3 className="text-lg font-semibold text-slate-900 mb-3">8. Limitation of Liability</h3>
                  <p className="text-slate-600 leading-relaxed">
                    To the maximum extent permitted by law, Trusit and Grover Agency are not liable for indirect, incidental, or consequential damages arising from your use of the Service, including but not limited to lost sales, lost data, or business interruption. Our total liability for any claim related to the Service is limited to the amount you paid in subscription fees during the three months preceding the claim.
                  </p>
                  <p className="text-slate-600 leading-relaxed mt-3">
                    This does not limit liability for fraud, gross negligence, or anything else that cannot be limited under applicable Kenyan law.
                  </p>
                </div>

                <div>
                  <h3 className="text-lg font-semibold text-slate-900 mb-3">9. Termination</h3>
                  <p className="text-slate-600 leading-relaxed">
                    You may stop using Trusit and cancel your subscription at any time by contacting support. We may suspend or terminate your account if you violate these Terms, engage in fraudulent activity, or if required by law.
                  </p>
                  <p className="text-slate-600 leading-relaxed mt-3">
                    Upon termination, your access to the Service will end, though we may retain your data for a period as described in our Privacy Policy, including for legal or regulatory purposes.
                  </p>
                </div>

                <div>
                  <h3 className="text-lg font-semibold text-slate-900 mb-3">10. Changes to These Terms</h3>
                  <p className="text-slate-600 leading-relaxed">
                    We may update these Terms from time to time. If we make material changes, we will notify you through the Service or via the contact details on your account. Continued use of Trusit after changes take effect constitutes acceptance of the updated Terms.
                  </p>
                </div>

                <div>
                  <h3 className="text-lg font-semibold text-slate-900 mb-3">11. Governing Law</h3>
                  <p className="text-slate-600 leading-relaxed">
                    These Terms are governed by the laws of Kenya. Any disputes arising from these Terms or your use of the Service will be subject to the jurisdiction of Kenyan courts.
                  </p>
                </div>

                <div>
                  <h3 className="text-lg font-semibold text-slate-900 mb-3">12. Contact Us</h3>
                  <p className="text-slate-600 leading-relaxed">
                    If you have questions about these Terms, contact us at:
                  </p>
                  <div className="mt-4 text-slate-600">
                    <p className="font-semibold">Grover Agency</p>
                    <p>Phone: 0743053511</p>
                    <p>Email: support@trusit.app</p>
                  </div>
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
