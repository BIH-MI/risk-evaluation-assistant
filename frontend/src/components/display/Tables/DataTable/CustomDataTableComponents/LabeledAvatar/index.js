import React from 'react';
import RABox from 'components/layout/RABox';
import RAAvatar from 'components/display/RAAvatar';
import RATypography from 'components/display/RATypography';


export default function LabeledAvatar({
                                          value,
                                          variant,
                                          size = 'xs',
                                          shape = 'circular',
                                          truncate = true,
                                      }) {
    if (!value) return null;

    // Props for RAAvatar
    const avatarProps = { variant, size, shape, alt: value };

    // Determine label style based on variant
    const isUser = variant === 'user';

    const typographyProps = {
        variant: isUser ? 'caption' : 'button',
        fontWeight: 'medium',
        noWrap: truncate,
        ...(isUser && { color: 'text' }),
    };

    return (
        <RABox
            display="flex"
            alignItems="center"
            gap={1}
            sx={{ width: '100%', overflow: 'hidden', whiteSpace: 'nowrap' }}
        >
            <RAAvatar {...avatarProps} />
            <RATypography {...typographyProps}>
                {value}
            </RATypography>
        </RABox>
    );
}