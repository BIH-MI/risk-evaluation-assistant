export const sxInput = {
    '& .MuiOutlinedInput-root': {
        fontSize: '2rem',
        height: 45,
        '&.Mui-disabled': {
            backgroundColor: 'transparent',
        }
    },
    '& .MuiOutlinedInput-input': {
        padding: '15px',
        textAlign: 'left',
        '&.Mui-disabled': {
            color: 'dark.main',
            WebkitTextFillColor: 'currentColor',
            opacity: 1,
        }
    },
    width: '100%'
};

export const sxSelect = {
    '& .MuiOutlinedInput-root': {
        height: 42,
        padding: 0,
        '&.Mui-disabled': {
            backgroundColor: 'transparent',
        }
    },
    '& .MuiOutlinedInput-input': {
        textAlign: 'left',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'flex-start',
        padding: '8px !important',
        '&.Mui-disabled': {
            color: 'dark.main',
            WebkitTextFillColor: 'currentColor',
            opacity: 1,
        }
    },
    '& .MuiSelect-icon': {
        '&.Mui-disabled': {
            color: 'dark.main',
            opacity: 1
        }
    },
    width: '116px'
};
