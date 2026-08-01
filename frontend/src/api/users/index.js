// api/users.js
import { useAuth } from 'react-oidc-context';
import { useCallback } from 'react';

export function useUsersApi() {
    const { user } = useAuth();
    const token = user?.access_token;
    const apiUrl = process.env.REACT_APP_API_URL || "http://localhost:8080";

    /**
     * Search users by free-text
     */
    const fetchUsers = useCallback(async (search) => {
        if (!token) throw new Error("Cannot fetch users without an access token");

        const res = await fetch(
            `${apiUrl}/api/users?search=${encodeURIComponent(search)}`,
            {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Accept': 'application/json',
                },
            }
        );
        if (!res.ok) {
            throw new Error(`Fetch users failed: ${res.status}`);
        }
        const data = await res.json();
        return data.map(u => ({
            username:     u.username,
            firstName:    u.firstName,
            lastName:     u.lastName,
            // email:        u.email,
            // role:         u.role         ?? "",
            // organization: u.organization ?? "",
        }));
    }, [apiUrl, token]);

    /**
     * Batch fetch users by exact usernames
     */
    const fetchUsersByUsernames = useCallback(async (usernames) => {
        if (!token) {
            throw new Error("Cannot fetch users without an access token");
        }
        if (!Array.isArray(usernames) || usernames.length === 0) {
            return [];
        }

        const res = await fetch(
            `${apiUrl}/api/users/batch`,
            {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Accept': 'application/json',
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(usernames),
            }
        );
        if (!res.ok) {
            throw new Error(`Fetch users by usernames failed: ${res.status}`);
        }
        const data = await res.json();
        return data.map(u => ({
            username:     u.username,
            firstName:    u.firstName,
            lastName:     u.lastName,
            // email:        u.email,
            // role:         u.role         ?? "",
            // organization: u.organization ?? "",
        }));
    }, [apiUrl, token]);

    return { fetchUsers, fetchUsersByUsernames };
}
