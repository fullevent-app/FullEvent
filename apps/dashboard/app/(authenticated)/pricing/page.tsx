"use client";

import { useUser } from "@stackframe/stack";
import { Button } from "@/components/ui/button";
import { Check, Zap, ArrowLeft } from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect } from "react";
import { toast } from "sonner";

const STARTER_PRODUCT_ID = "8efd184b-29ce-4d37-a27a-cc9a9560f1a6";
const PRO_PRODUCT_ID = "17c29f42-f723-4cf7-b3bd-0ce235870972";

const plans = [
    {
        name: "Free",
        price: "$0",
        period: "forever",
        description: "Perfect for trying out FullEvent",
        features: [
            "10k events/month",
            "7 day retention",
            "1 project",
            "Community support",
        ],
        cta: "Current Plan",
        disabled: true,
    },
    {
        name: "Starter",
        price: "$29",
        period: "per month",
        description: "Great for small teams and side projects",
        features: [
            "100k events/month",
            "30 day retention",
            "3 projects",
            "Email support",
            "Advanced search",
        ],
        cta: "Upgrade to Starter",
        productId: STARTER_PRODUCT_ID,
        popular: true,
    },
    {
        name: "Pro",
        price: "$99",
        period: "per month",
        description: "For growing teams with serious needs",
        features: [
            "1M events/month",
            "90 day retention",
            "Unlimited projects",
            "Priority support",
            "Advanced analytics",
            "Custom integrations",
        ],
        cta: "Upgrade to Pro",
        productId: PRO_PRODUCT_ID,
    },
];

export default function PricingPage() {
    const user = useUser();
    const searchParams = useSearchParams();

    useEffect(() => {
        if (searchParams.get("success") === "true") {
            toast.success("Payment successful! Your subscription is now active.");
        }
    }, [searchParams]);

    const handleUpgrade = (productId: string) => {
        if (!user) {
            toast.error("Please sign in to upgrade");
            return;
        }

        const checkoutUrl = new URL("/api/checkout", window.location.origin);
        checkoutUrl.searchParams.set("products", productId);
        checkoutUrl.searchParams.set("customerEmail", user.primaryEmail || "");
        checkoutUrl.searchParams.set("customerName", user.displayName || "");
        checkoutUrl.searchParams.set("customerExternalId", user.id);

        window.location.assign(checkoutUrl.toString());
    };

    return (
        <div className="min-h-screen bg-background">
            <div className="container mx-auto px-4 py-16">
                {/* Header */}
                <div className="mb-12">
                    <Button variant="ghost" size="sm" asChild className="mb-4">
                        <Link href="/">
                            <ArrowLeft className="h-4 w-4 mr-2" />
                            Back to Dashboard
                        </Link>
                    </Button>
                    <h1 className="text-4xl font-bold tracking-tight mb-4">
                        Simple, transparent pricing
                    </h1>
                    <p className="text-xl text-muted-foreground">
                        Choose the plan that fits your needs. Upgrade or downgrade anytime.
                    </p>
                </div>

                {/* Pricing Cards */}
                <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
                    {plans.map((plan) => (
                        <div
                            key={plan.name}
                            className={`relative border rounded-lg p-8 flex flex-col ${plan.popular
                                ? "border-primary shadow-lg scale-105"
                                : "border-border"
                                }`}
                        >
                            {plan.popular && (
                                <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                                    <span className="bg-primary text-primary-foreground px-4 py-1 rounded-full text-sm font-medium flex items-center gap-1">
                                        <Zap className="h-3 w-3" />
                                        Most Popular
                                    </span>
                                </div>
                            )}

                            <div className="mb-6">
                                <h3 className="text-2xl font-bold mb-2">{plan.name}</h3>
                                <div className="flex items-baseline gap-1 mb-2">
                                    <span className="text-4xl font-bold">{plan.price}</span>
                                    <span className="text-muted-foreground">/{plan.period}</span>
                                </div>
                                <p className="text-sm text-muted-foreground">
                                    {plan.description}
                                </p>
                            </div>

                            <ul className="space-y-3 mb-8 flex-1">
                                {plan.features.map((feature) => (
                                    <li key={feature} className="flex items-start gap-2">
                                        <Check className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
                                        <span className="text-sm">{feature}</span>
                                    </li>
                                ))}
                            </ul>

                            <Button
                                size="lg"
                                variant={plan.popular ? "default" : "outline"}
                                disabled={plan.disabled}
                                onClick={() => plan.productId && handleUpgrade(plan.productId)}
                                className="w-full"
                            >
                                {plan.cta}
                            </Button>
                        </div>
                    ))}
                </div>

                {/* FAQ or Additional Info */}
                <div className="mt-16 text-center">
                    <p className="text-muted-foreground">
                        Need more? Contact us for{" "}
                        <span className="font-semibold text-foreground">Enterprise</span> pricing
                        with custom volume, retention, and SLA.
                    </p>
                </div>
            </div>
        </div>
    );
}
