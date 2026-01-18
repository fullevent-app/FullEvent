'use client';
import { useEffect } from 'react';
import { useUser } from '@stackframe/stack';
import { useRouter } from 'next/navigation';

export function useOnboarding() {
    const user = useUser();
    const router = useRouter();

    useEffect(() => {
        if (!user?.clientReadOnlyMetadata.onboarded) {
            router.push('/onboarding');
        }
    }, [user, router]);
}