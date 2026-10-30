import { useEffect, useState } from "react";

import { useUsersApi } from "api/users";

/**
 * Users the activity is shared with. The usernames are what is saved; the user objects shown in
 * the autocomplete are loaded for them.
 */
export default function useSharedUsers() {
  const { fetchUsersByUsernames } = useUsersApi();
  const [sharedUsernames, setSharedUsernames] = useState([]);
  const [sharedUsers, setSharedUsers] = useState([]);

  useEffect(() => {
    if (sharedUsernames.length === 0) {
      setSharedUsers([]);
      return undefined;
    }

    let active = true;
    fetchUsersByUsernames(sharedUsernames)
      .then((users) => {
        if (active) setSharedUsers(users);
      })
      .catch(() => {
        if (active) setSharedUsers([]);
      });

    return () => {
      // Ignore a completed request after the usernames changed or the form was left.
      active = false;
    };
  }, [fetchUsersByUsernames, sharedUsernames]);

  const changeSharedUsers = (_, users) => {
    const nextUsers = users || [];
    setSharedUsers(nextUsers);
    setSharedUsernames(nextUsers.map((user) => user.username));
  };

  return { sharedUsernames, sharedUsers, setSharedUsernames, changeSharedUsers };
}
