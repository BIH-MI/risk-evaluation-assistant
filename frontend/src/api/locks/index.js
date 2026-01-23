import { useAuth } from 'react-oidc-context';
import { useCallback } from 'react'; // 1. Import useCallback

export function useEntityLockApi() {
    const { user } = useAuth();
    const token = user?.access_token;
    const apiUrl = process.env.REACT_APP_API_URL || "http://localhost:8080";

    const lock = useCallback(async (entityType, id) => {
        const res = await fetch(`${apiUrl}/api/locks/${entityType}/${id}`, {
            method: 'POST',
            headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok) return;
        if (res.status === 409) {
            // It's good practice to get the error message from the response if available
            const err = await res.text();
            throw new Error(err || 'This item is locked by another user.');
        }
        throw new Error('Could not acquire lock (unexpected error).');
    }, [apiUrl, token]); // 3. Add dependencies used inside the function

    const unlock = useCallback(async (entityType, id) => {
        await fetch(`${apiUrl}/api/locks/${entityType}/${id}`, {
            method: 'DELETE',
            headers: { Authorization: `Bearer ${token}` },
        });
    }, [apiUrl, token]);

    const who = useCallback(async (entityType, id) => {
        const res = await fetch(`${apiUrl}/api/locks/${entityType}/${id}`, {
            headers: { Authorization: `Bearer ${token}` }
        });
        if (res.status === 204) return null; // No lock exists
        if (!res.ok) {
            const err = await res.text();
            throw new Error(err || `Failed to fetch lock holder for ${entityType}/${id}`);
        }
        const { lockedBy } = await res.json();
        return lockedBy;
    }, [apiUrl, token]);

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
            const text = await res.text();
            throw new Error(text || `Failed to fetch locks for ${entityType}`);
        }
        return await res.json();
    }, [apiUrl, token]);


    return { lock, unlock, who, getLocks };
}