"use server";

import { db } from "@/lib/db";
import { user } from "@/lib/auth-schema";
import { eq } from "drizzle-orm";

export async function checkEmailExists(email: string): Promise<boolean> {
    const existingUser = await db
        .select({ id: user.id })
        .from(user)
        .where(eq(user.email, email.toLowerCase()))
        .limit(1);

    return existingUser.length > 0;
}
