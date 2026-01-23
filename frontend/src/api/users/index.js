// api/users.js
import { useAuth } from 'react-oidc-context';

export function useUsersApi() {
    const { user } = useAuth();
    const token = user?.access_token;
    const apiUrl = process.env.REACT_APP_API_URL || "http://localhost:8080";

    /**
     * Search users by free-text
     */
    async function fetchUsers(search) {
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
            const text = await res.text();
            console.error("[fetchUsers] error:", text.slice(0, 200));
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
    }

    /**
     * Batch fetch users by exact usernames
     */
    async function fetchUsersByUsernames(usernames) {
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
            const text = await res.text();
            console.error("[fetchUsersByUsernames] error:", text.slice(0, 200));
            throw new Error(`Fetch users by usernames failed:å ${res.status}`);
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
    }

    return { fetchUsers, fetchUsersByUsernames };
}