import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, CheckCircle2, Store, Zap, Package, Users, Receipt, BarChart3, QrCode, Smartphone } from "lucide-react";
import React, { useState } from "react";
import { getCurrentShop } from "@/lib/auth.functions";

export const Route = createFileRoute("/")({
  beforeLoad: async () => {
    const shop = await getCurrentShop();
    if (shop) {
      if (shop.needs_onboarding) {
        throw createFileRoute("/")({}).redirect({ to: "/onboarding" });
      }
      throw createFileRoute("/")({}).redirect({ to: "/dashboard" });
    }
  },
  component: LandingPage,
});

function LandingPage() {
  const features = [
    {
      icon: Zap,
      title: "Quick Sale",
      description: "Tap the items, see the total, done. Built for the rush — no fumbling, no delays while customers wait in line.",
    },
    {
      icon: Smartphone,
      title: "M-Pesa, Built In",
      description: "Send an STK push straight to your customer's phone, or share a payment link they can pay from their own M-Pesa. Either way, the money lands and Trusit records it instantly.",
    },
    {
      icon: Receipt,
      title: "Cash Sales, Tracked Too",
      description: "Not every customer pays with M-Pesa. Record cash sales the same way — same receipt, same stock update, same record-keeping.",
    },
    {
      icon: Package,
      title: "Stock That Updates Itself",
      description: "Add your products once. Every sale — cash or M-Pesa — takes it off your shelf in the system automatically. No more counting stock to figure out what sold.",
    },
    {
      icon: QrCode,
      title: "Barcode Scanning",
      description: "Got products with barcodes? Scan and go. Faster checkout, fewer mistakes.",
    },
    {
      icon: Users,
      title: "Staff Access Without the Worry",
      description: "Invite your employees to use Trusit on their own logins. They can sell — they can't touch your prices, your stock settings, or your subscription. You stay in control.",
    },
    {
      icon: Receipt,
      title: "Receipts, Automatically",
      description: "Every sale generates a digital receipt — for you and your customer. No more 'let me write it down.'",
    },
    {
      icon: BarChart3,
      title: "See How Your Business Is Doing",
      description: "Total sales, total revenue, average sale size — at a glance, whenever you want to check.",
    },
  ];

  const steps = [
    {
      number: "1",
      title: "Sign Up",
      description: "Enter your name, your shop name, and your phone number. Set a 4-digit PIN for your till. Takes two minutes.",
    },
    {
      number: "2",
      title: "Set Up Your Till",
      description: "Tell us your till number or paybill. We connect it so M-Pesa payments go straight to where your money already goes.",
    },
    {
      number: "3",
      title: "Add Your Products",
      description: "List what you sell and how much stock you have. Trusit handles the rest from here.",
    },
    {
      number: "4",
      title: "Start Selling",
      description: "Open Trusit, tap your items, take payment — M-Pesa or cash. That's it. Your records build themselves.",
    },
  ];

  const faqs = [
    {
      question: "Do I need to use M-Pesa to use Trusit?",
      answer: "No. You can record cash sales just as easily — Trusit tracks your stock and sales either way. M-Pesa is built in for when you need it.",
    },
    {
      question: "Can my employees use Trusit too?",
      answer: "Yes. Invite them with their own login. They can make sales, but they can't see your subscription details or change your product prices and stock settings — that stays with you.",
    },
    {
      question: "What happens after my 14-day trial?",
      answer: "You choose Basic or Pro to keep going. If you don't subscribe, your account locks until you do — but your data stays safe and waiting.",
    },
    {
      question: "Does Trusit work if my internet is slow?",
      answer: "Trusit is built mobile-first and lightweight, designed for everyday conditions in Kenyan markets and shops.",
    },
    {
      question: "Is my data safe?",
      answer: "Yes. Your sales, stock, and customer information are private to your shop — staff only see what they need to do their job.",
    },
    {
      question: "Can I switch from Basic to Pro?",
      answer: "Yes — you can upgrade once your current billing period ends, switching straight into Pro with all features unlocked.",
    },
  ];

  const [expandedFaq, setExpandedFaq] = useState<number | null>(null);

  return (
    <div className="min-h-screen bg-white">
      {/* Navigation */}
      <nav className="fixed top-0 w-full bg-white/80 backdrop-blur-sm border-b border-slate-200 z-50">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <Store className="h-6 w-6 text-green-600" />
            <span className="font-bold text-lg text-slate-900">Trusit</span>
          </div>
          <div className="flex gap-4">
            <Link to="/signin" className="px-4 py-2 text-slate-600 hover:text-slate-900 font-medium">
              Sign In
            </Link>
            <Link
              to="/register"
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium"
            >
              Get Started
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="pt-32 pb-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-6xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div>
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-slate-900 leading-tight mb-6">
                Run Your Duka Without the Headache
              </h1>
              <p className="text-lg text-slate-600 mb-8 leading-relaxed">
                Trusit is the till, the receipt book, and the stock ledger — all in your pocket. Accept M-Pesa, record cash sales, track your stock, and know exactly how your business is doing. No paperwork, no guesswork.
              </p>
              <div className="flex flex-col sm:flex-row gap-4">
                <Link
                  to="/register"
                  className="inline-flex items-center justify-center px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 font-semibold transition"
                >
                  Start Free — 14 Days, No Card Needed
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Link>
                <Link
                  to="/signin"
                  className="inline-flex items-center justify-center px-6 py-3 border-2 border-slate-300 text-slate-900 rounded-lg hover:border-slate-400 font-semibold transition"
                >
                  Sign In
                </Link>
              </div>
            </div>
            <div className="hidden lg:flex items-center justify-center">
              <div className="relative w-full h-96 bg-gradient-to-br from-green-50 to-slate-50 rounded-2xl border-2 border-green-100 flex items-center justify-center">
                <Store className="h-32 w-32 text-green-200" />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Problem/Solution Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-slate-50">
        <div className="max-w-6xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 mb-16">
            <div>
              <h2 className="text-3xl sm:text-4xl font-bold text-slate-900 mb-6">Sound familiar?</h2>
              <p className="text-lg text-slate-600 leading-relaxed">
                You're juggling a notebook for stock, your M-Pesa messages for sales, and your memory for everything else. At the end of the month, you're not sure if you made money or just moved it around. When your employee is at the till, you don't really know what's going on until you check the stock yourself.
              </p>
            </div>
            <div className="bg-red-50 border-l-4 border-red-300 p-8 rounded-lg">
              <div className="space-y-3 text-slate-600">
                <p className="flex items-start gap-2">
                  <span className="text-red-500 font-bold mt-1">✕</span>
                  <span>Stock notebooks that don't match reality</span>
                </p>
                <p className="flex items-start gap-2">
                  <span className="text-red-500 font-bold mt-1">✕</span>
                  <span>M-Pesa messages mixed with everything else</span>
                </p>
                <p className="flex items-start gap-2">
                  <span className="text-red-500 font-bold mt-1">✕</span>
                  <span>No idea what's actually selling</span>
                </p>
                <p className="flex items-start gap-2">
                  <span className="text-red-500 font-bold mt-1">✕</span>
                  <span>Can't trust staff at the till without checking</span>
                </p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
            <div className="bg-green-50 border-l-4 border-green-300 p-8 rounded-lg order-last lg:order-first">
              <div className="space-y-3 text-slate-600">
                <p className="flex items-start gap-2">
                  <CheckCircle2 className="h-6 w-6 text-green-600 flex-shrink-0 mt-0.5" />
                  <span>Every sale recorded instantly</span>
                </p>
                <p className="flex items-start gap-2">
                  <CheckCircle2 className="h-6 w-6 text-green-600 flex-shrink-0 mt-0.5" />
                  <span>Stock updates automatically</span>
                </p>
                <p className="flex items-start gap-2">
                  <CheckCircle2 className="h-6 w-6 text-green-600 flex-shrink-0 mt-0.5" />
                  <span>See what's really selling</span>
                </p>
                <p className="flex items-start gap-2">
                  <CheckCircle2 className="h-6 w-6 text-green-600 flex-shrink-0 mt-0.5" />
                  <span>Staff access with full control in your hands</span>
                </p>
              </div>
            </div>
            <div>
              <h2 className="text-3xl sm:text-4xl font-bold text-slate-900 mb-6">That's what Trusit fixes.</h2>
              <p className="text-lg text-slate-600 leading-relaxed">
                Every sale — M-Pesa or cash — gets recorded the moment it happens. Your stock updates itself. Your staff can sell without you hovering over them. And at the end of the day, you open one app and see exactly what happened in your shop.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section className="py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-3xl sm:text-4xl font-bold text-slate-900 mb-16 text-center">What Trusit Can Do</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {features.map((feature, idx) => {
              const Icon = feature.icon;
              return (
                <div
                  key={idx}
                  className={`p-6 rounded-xl border border-slate-200 hover:border-green-300 hover:shadow-lg transition ${
                    idx % 4 === 0 ? "lg:col-span-2 lg:row-span-2" : ""
                  }`}
                >
                  <Icon className="h-8 w-8 text-green-600 mb-4" />
                  <h3 className="font-semibold text-slate-900 mb-2">{feature.title}</h3>
                  <p className="text-slate-600 text-sm leading-relaxed">{feature.description}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-slate-50">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-3xl sm:text-4xl font-bold text-slate-900 mb-16 text-center">How It Works</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {steps.map((step, idx) => (
              <div key={idx} className="relative">
                <div className="flex flex-col items-center text-center">
                  <div className="w-16 h-16 bg-green-600 text-white rounded-full flex items-center justify-center text-2xl font-bold mb-6 relative z-10">
                    {step.number}
                  </div>
                  <h3 className="text-xl font-semibold text-slate-900 mb-3">{step.title}</h3>
                  <p className="text-slate-600 leading-relaxed">{step.description}</p>
                </div>
                {idx < steps.length - 1 && (
                  <div className="hidden lg:block absolute top-16 left-1/2 w-full h-1 bg-green-100 transform translate-y-0 -z-0" />
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section className="py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold text-slate-900 mb-4">Simple Pricing. No Surprises.</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Trial */}
            <div className="border-2 border-slate-200 rounded-xl p-8 hover:border-slate-300 transition">
              <h3 className="text-2xl font-bold text-slate-900 mb-2">Trial</h3>
              <p className="text-slate-600 mb-6">Free for 14 Days</p>
              <ul className="space-y-3 text-slate-600">
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="h-5 w-5 text-green-600 flex-shrink-0" />
                  <span>Everything unlocked</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="h-5 w-5 text-green-600 flex-shrink-0" />
                  <span>No card required</span>
                </li>
              </ul>
              <button className="w-full mt-8 py-3 border-2 border-slate-300 text-slate-900 rounded-lg hover:border-slate-400 font-semibold">
                Get Started
              </button>
            </div>

            {/* Basic */}
            <div className="border-2 border-slate-200 rounded-xl p-8 hover:border-slate-300 transition">
              <h3 className="text-2xl font-bold text-slate-900 mb-2">Basic</h3>
              <p className="text-slate-600 mb-1">KES 299</p>
              <p className="text-slate-500 text-sm mb-6">per month</p>
              <ul className="space-y-3 text-slate-600 mb-8">
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="h-5 w-5 text-green-600 flex-shrink-0" />
                  <span>Quick Sale & checkout</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="h-5 w-5 text-green-600 flex-shrink-0" />
                  <span>M-Pesa STK & payment links</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="h-5 w-5 text-green-600 flex-shrink-0" />
                  <span>Cash recording</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="h-5 w-5 text-green-600 flex-shrink-0" />
                  <span>Stock & products</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="h-5 w-5 text-green-600 flex-shrink-0" />
                  <span>Barcode scanning</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="h-5 w-5 text-green-600 flex-shrink-0" />
                  <span>Receipts</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="h-5 w-5 text-green-600 flex-shrink-0" />
                  <span>1 staff account</span>
                </li>
              </ul>
              <button className="w-full py-3 border-2 border-slate-300 text-slate-900 rounded-lg hover:border-slate-400 font-semibold">
                Choose Basic
              </button>
            </div>

            {/* Pro */}
            <div className="border-2 border-green-600 rounded-xl p-8 bg-green-50 relative">
              <div className="absolute -top-4 left-1/2 transform -translate-x-1/2 bg-green-600 text-white px-4 py-1 rounded-full text-sm font-semibold">
                Most Popular
              </div>
              <h3 className="text-2xl font-bold text-slate-900 mb-2">Pro</h3>
              <p className="text-slate-600 mb-1">KES 499</p>
              <p className="text-slate-500 text-sm mb-6">per month</p>
              <ul className="space-y-3 text-slate-600 mb-8">
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="h-5 w-5 text-green-600 flex-shrink-0" />
                  <span>Everything in Basic</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="h-5 w-5 text-green-600 flex-shrink-0" />
                  <span>Analytics dashboard</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="h-5 w-5 text-green-600 flex-shrink-0" />
                  <span>Revenue trends</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="h-5 w-5 text-green-600 flex-shrink-0" />
                  <span>Top products</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="h-5 w-5 text-green-600 flex-shrink-0" />
                  <span>Up to 5 staff accounts</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="h-5 w-5 text-green-600 flex-shrink-0" />
                  <span>Customer insights</span>
                </li>
              </ul>
              <button className="w-full py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 font-semibold">
                Choose Pro
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-slate-50">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-3xl sm:text-4xl font-bold text-slate-900 mb-12 text-center">Frequently Asked Questions</h2>
          <div className="space-y-4">
            {faqs.map((faq, idx) => (
              <button
                key={idx}
                onClick={() => setExpandedFaq(expandedFaq === idx ? null : idx)}
                className="w-full text-left"
              >
                <div className="bg-white border border-slate-200 rounded-lg p-6 hover:border-slate-300 transition">
                  <div className="flex justify-between items-start">
                    <h3 className="font-semibold text-slate-900 pr-4">{faq.question}</h3>
                    <span className={`text-green-600 text-xl flex-shrink-0 transition transform ${expandedFaq === idx ? "rotate-180" : ""}`}>
                      ▼
                    </span>
                  </div>
                  {expandedFaq === idx && (
                    <p className="text-slate-600 mt-4 leading-relaxed">{faq.answer}</p>
                  )}
                </div>
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-gradient-to-r from-green-600 to-green-700">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-3xl sm:text-4xl font-bold text-white mb-6">Ready to run your shop better?</h2>
          <p className="text-lg text-green-50 mb-8">Start your free 14-day trial today. No card needed, no commitment.</p>
          <Link
            to="/register"
            className="inline-flex items-center justify-center px-8 py-4 bg-white text-green-600 rounded-lg hover:bg-green-50 font-semibold text-lg transition"
          >
            Start Free Today
            <ArrowRight className="ml-2 h-5 w-5" />
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-slate-900 text-slate-300 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-6xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-8">
            <div>
              <div className="flex items-center gap-2 mb-4">
                <Store className="h-6 w-6 text-green-500" />
                <span className="font-bold text-white">Trusit</span>
              </div>
              <p className="text-sm">M-Pesa payments for Kenyan merchants.</p>
            </div>
            <div className="text-center">
              <p className="text-sm mb-4">© 2026 Trusit. Built for Kenyan shop owners, by people who get it.</p>
            </div>
            <div className="flex justify-end gap-6 text-sm">
              <Link to="/terms" className="hover:text-white transition">
                Terms of Use
              </Link>
              <Link to="/privacy" className="hover:text-white transition">
                Privacy Policy
              </Link>
            </div>
          </div>
          <div className="border-t border-slate-700 pt-8 text-center text-sm text-slate-400">
            <p>Contact Support: support@trusit.app</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
