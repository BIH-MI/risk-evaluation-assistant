// src/components/display/DateTimeDisplay.jsx
import React from 'react';
import RATypography from '../../../../RATypography';
import RABox from "../../../../../layout/RABox";
import CalendarTodayIcon from '@mui/icons-material/CalendarToday';
import AccessTimeIcon from '@mui/icons-material/AccessTime';

/**
 * Renders an ISO date/time string as "MM/DD/YYYY HH:MM".
 * Reusable anywhere you need date + time.
 */
export default function DateTimeDisplay({ value }) {
  if (!value) return null;
  const dt = new Date(value);
  const date = dt.toLocaleDateString();
  const time = dt.toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });

  const iconSx = { fontSize: 14, color: "text.primary" };

  return (
    <RABox
      display="inline-flex"
      flexDirection="column"
      alignItems="flex-start"
      gap={0.5}
    >
      <RABox display="flex" alignItems="center" gap={1}>
        <CalendarTodayIcon sx={iconSx} />
        <RATypography variant="caption" color="text" fontWeight="medium">
          {date}
        </RATypography>
      </RABox>

      <RABox display="flex" alignItems="center" gap={1}>
        <AccessTimeIcon sx={iconSx} />
        <RATypography variant="caption" color="text" fontWeight="medium">
          {time}
        </RATypography>
      </RABox>
    </RABox>
  );
}