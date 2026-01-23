import React from 'react';
import Tooltip from '@mui/material/Tooltip';
import RAAvatar from '../../../../RAAvatar';
import RABox from '../../../../../layout/RABox';
import RATypography from '../../../../RATypography';


export default function SharedUsersList({
                                            usernames = [],
                                            maxVisible = 3,
                                            avatarVariant = 'user',
                                            avatarShape = 'circular',
                                            avatarSize = 'xs',
                                        }) {
    // Determine which usernames to show and how many are hidden
    const visibleUsers = usernames.slice(0, maxVisible);
    const extraCount = usernames.length - maxVisible;

    return (
        <RABox sx={{ display: 'flex', alignItems: 'center', overflow: 'hidden', whiteSpace: 'nowrap' }}>
            {visibleUsers.map((username) => (
                <Tooltip key={username} title={username} placement="bottom">
                    <RAAvatar
                        variant={avatarVariant}
                        alt={username}
                        size={avatarSize}
                        shape={avatarShape}
                    />
                </Tooltip>
            ))}
            {extraCount > 0 && (
                <Tooltip title={`${extraCount} more`} placement="bottom">
                    <RATypography variant="caption" noWrap sx={{ ml: 1 }}>
                        ...
                    </RATypography>
                </Tooltip>
            )}
        </RABox>
    );
}
