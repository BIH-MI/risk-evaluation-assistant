import { useAuth } from 'react-oidc-context';
import { useCallback } from 'react';
import { apiUrl, handleApiError } from 'api/httpClient';

export function useEntityLockApi() {
    const { user } = useAuth();
    const token = user?.access_token;

    const lock = useCallback(async (entityType, id) => {
        const res = await fetch(`${apiUrl}/api/locks/${entityType}/${id}`, {
            method: 'POST',
            headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok) return;
        if (res.status === 409) {
            await handleApiError(res, 'This item is locked by another user.');
        }
        await handleApiError(res, 'Could not acquire lock (unexpected error).');
    }, [token]);

    const unlock = useCallback(async (entityType, id) => {
        await fetch(`${apiUrl}/api/locks/${entityType}/${id}`, {
            method: 'DELETE',
            headers: { Authorization: `Bearer ${token}` },
        });
    }, [token]);

    const who = useCallback(async (entityType, id) => {
        const res = await fetch(`${apiUrl}/api/locks/${entityType}/${id}`, {
            headers: { Authorization: `Bearer ${token}` }
        });
        if (res.status === 204) return null; // No lock exists
        if (!res.ok) {
            await handleApiError(res, `Failed to fetch lock holder for ${entityType}/${id}`);
        }
        const { lockedBy } = await res.json();
        return lockedBy;
    }, [token]);

    const getLocks = useCallback(async (entityType, ids) => {
        const res = await fetch(`${apiUrl}/api/locks/${entityType}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify(ids),
        });
        if (!res.ok) {
            await handleApiError(res, `Failed to fetch locks for ${entityType}`);
        }
        return await res.json();
    }, [token]);


    return { lock, unlock, who, getLocks };
}
