"use client";

import { Navbar } from "@/components/landing/navbar";
import { Hero } from "@/components/landing/hero";
import { FeaturesGrid } from "@/components/landing/features-grid";
import { CodeShowcase } from "@/components/landing/code-showcase";
import { SparkEffect } from "@/components/landing/spark-effect";
import { motion } from "motion/react";
import { ArrowRight, Github, Twitter, Linkedin, MessageCircle } from "lucide-react";
import { LogLineLogo } from "@/components/landing/logo";
import { Button } from "@/components/ui/button";
import Link from "next/link";

// Stats section with cosmic styling
function StatsSection() {
    const stats = [
        { value: "42B+", label: "Events Processed", sublabel: "The answer to everything" },
        { value: "<10ms", label: "P99 Latency", sublabel: "Faster than light (almost)" },
        { value: "∞", label: "Retention", sublabel: "Until heat death of universe" },
        { value: "99.99%", label: "Uptime", sublabel: "Mostly harmless downtime" },
    ];

    return (
        <section className="relative py-24 overflow-hidden">
            {/* <div className="absolute inset-0 bg-[#050507]" /> Removed for spark effect */}

            {/* Central glow */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="w-[600px] h-[400px] bg-gradient-radial from-cyan-500/10 via-transparent to-transparent blur-3xl" />
            </div>

            <div className="container px-6 mx-auto relative z-10">
                <motion.div
                    initial={{ opacity: 0, y: 30 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.8 }}
                    className="text-center mb-16"
                >
                    <h2 className="text-3xl md:text-4xl font-display text-white mb-4">
                        Numbers that matter
                    </h2>
                    <p className="text-zinc-500 text-lg">
                        (Even if 42 is the only one that truly counts)
                    </p>
                </motion.div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-6 md:gap-8">
                    {stats.map((stat, i) => (
                        <motion.div
                            key={stat.label}
                            initial={{ opacity: 0, y: 20 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true }}
                            transition={{ delay: i * 0.1, duration: 0.6 }}
                            className="text-center p-6 rounded-2xl border border-white/[0.05] bg-white/[0.02]"
                        >
                            <div className="text-4xl md:text-5xl font-display gradient-text-cyan mb-2">
                                {stat.value}
                            </div>
                            <div className="text-white font-medium mb-1">{stat.label}</div>
                            <div className="text-zinc-600 text-sm">{stat.sublabel}</div>
                        </motion.div>
                    ))}
                </div>
            </div>
        </section>
    );
}

// CTA Section
function CTASection() {
    return (
        <section className="relative py-32 overflow-hidden">
            {/* <div className="absolute inset-0 bg-[#050507]" /> Removed for spark effect */}



            <div className="container px-6 mx-auto relative z-10">
                <motion.div
                    initial={{ opacity: 0, y: 40 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.8 }}
                    className="text-center max-w-3xl mx-auto"
                >
                    <h2 className="text-4xl md:text-5xl lg:text-6xl font-display text-white mb-6 tracking-tight">
                        Ready to explore
                        <br />
                        <span className="shimmer-text">the infinite?</span>
                    </h2>
                    <p className="text-lg md:text-xl text-zinc-400 mb-10 leading-relaxed">
                        Join thousands of developers who&apos;ve upgraded their towel game.
                        <br className="hidden md:block" />
                        Free tier available. No credit card required. No vogon poetry.
                    </p>

                    <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                        <Button
                            size="lg"
                            className="h-14 px-10 text-base bg-white text-black hover:bg-zinc-200 font-semibold rounded-xl"
                        >
                            Start for Free
                            <ArrowRight className="ml-2 h-5 w-5" />
                        </Button>
                        <Button
                            size="lg"
                            variant="outline"
                            className="h-14 px-10 text-base border-white/10 bg-white/5 hover:bg-white/10 text-white backdrop-blur-sm rounded-xl"
                        >
                            Book a Demo
                        </Button>
                    </div>
                </motion.div>
            </div>
        </section>
    );
}

// Footer
function Footer() {
    const footerLinks = {
        Product: [
            { label: "Features", href: "#" },
            { label: "Pricing", href: "#" },
            { label: "Changelog", href: "#" },
            { label: "Roadmap", href: "#" },
        ],
        Resources: [
            { label: "Documentation", href: "#" },
            { label: "API Reference", href: "#" },
            { label: "Guides", href: "#" },
            { label: "Examples", href: "#" },
        ],
        Company: [
            { label: "About", href: "#" },
            { label: "Blog", href: "#" },
            { label: "Careers", href: "#" },
            { label: "Contact", href: "#" },
        ],
        Legal: [
            { label: "Privacy", href: "#" },
            { label: "Terms", href: "#" },
            { label: "Security", href: "#" },
        ],
    };

    const socialLinks = [
        { icon: Github, href: "https://github.com/fullevent", label: "GitHub" },
        { icon: Twitter, href: "https://twitter.com/fullevent", label: "Twitter" },
        { icon: Linkedin, href: "https://linkedin.com/company/fullevent", label: "LinkedIn" },
        { icon: MessageCircle, href: "https://discord.gg/fullevent", label: "Discord" },
    ];

    return (
        <footer className="relative border-t border-white/[0.05]">
            {/* Subtle top glow */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-1/2 h-px bg-gradient-to-r from-transparent via-cyan-500/50 to-transparent" />

            <div className="container px-6 mx-auto py-16">
                {/* Main footer content */}
                <div className="grid grid-cols-2 md:grid-cols-6 gap-8 mb-16">
                    {/* Brand column */}
                    <div className="col-span-2">
                        <div className="flex items-center gap-3 mb-4">
                            <LogLineLogo size={28} animated={false} />
                            <span className="text-lg font-display tracking-tight text-white">
                                FullEvent
                            </span>
                        </div>
                        <p className="text-zinc-500 text-sm leading-relaxed mb-6 max-w-xs">
                            The infinite improbability event analytics platform.
                            Don&apos;t panic—we&apos;ve got your data covered.
                        </p>
                        <div className="flex items-center gap-4">
                            {socialLinks.map((social) => (
                                <Link
                                    key={social.label}
                                    href={social.href}
                                    target="_blank"
                                    className="text-zinc-600 hover:text-white transition-colors"
                                    aria-label={social.label}
                                >
                                    <social.icon className="h-5 w-5" />
                                </Link>
                            ))}
                        </div>
                    </div>

                    {/* Link columns */}
                    {Object.entries(footerLinks).map(([category, links]) => (
                        <div key={category}>
                            <h4 className="text-white font-medium mb-4 text-sm">{category}</h4>
                            <ul className="space-y-3">
                                {links.map((link) => (
                                    <li key={link.label}>
                                        <Link
                                            href={link.href}
                                            className="text-zinc-500 hover:text-white transition-colors text-sm"
                                        >
                                            {link.label}
                                        </Link>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    ))}
                </div>

                {/* Bottom bar */}
                <div className="pt-8 border-t border-white/[0.05] flex flex-col md:flex-row justify-between items-center gap-4">
                    <p className="text-zinc-600 text-sm">
                        © {new Date().getFullYear()} FullEvent Inc. All rights reserved across all dimensions.
                    </p>
                    <p className="text-zinc-700 text-xs font-mono">
                        &quot;So long, and thanks for all the events&quot; 🐬
                    </p>
                </div>
            </div>
        </footer>
    );
}

export default function LandingPage() {
    return (
        <main className="min-h-screen bg-[#050507] font-sans selection:bg-cyan-500/30 selection:text-cyan-200 relative">
            <SparkEffect />
            <Navbar />
            <Hero />

            <FeaturesGrid />
            <CodeShowcase />
            <StatsSection />
            <CTASection />

            <Footer />
        </main>
    );
}
