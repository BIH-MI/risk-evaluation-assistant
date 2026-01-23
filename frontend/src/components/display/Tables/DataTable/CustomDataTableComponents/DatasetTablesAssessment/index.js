import React, { useState } from 'react';
import { FormControlLabel, Checkbox } from '@mui/material';
import RABox from 'components/layout/RABox';
import DataTable from 'components/display/Tables/DataTable';
import RAInput from 'components/input/RAInput';
import { useDatasetAssessmentFormTableConfig } from './useDatasetAssessmentFormTableConfig';


function DatasetTablesAssessment({
                                     tables,
                                     setTables,
                                     originals,
                                     showShowExcludedCheckbox = true,
                                     showOverriddenColumn = false,
                                 }) {

    const { columnsByTable, addAttr } = useDatasetAssessmentFormTableConfig(
        tables,
        setTables,
        originals,
        { showOverridden: showOverriddenColumn }
    );

    const [showExcluded, setShowExcluded] = useState(false);

    const getRowProps = (row) => ({
        sx: row.original?.isExcluded
            ? { backgroundColor: 'rgba(255, 0, 0, 0.1)' }
            : {}
    });

    return (
        <>
            {tables.map((tbl) => (
                <RABox key={tbl.tableId} mb={4}>
                    <RABox display="flex" alignItems="center" justifyContent="space-between" mb={1}>
                        <RAInput
                            label="Table Name"
                            value={tbl.tableName}
                            disabled
                            variant="standard"
                            sx={{ maxWidth: 300 }}
                        />
                        {showShowExcludedCheckbox && (
                            <FormControlLabel
                                control={
                                    <Checkbox
                                        checked={showExcluded}
                                        onChange={(e) => setShowExcluded(e.target.checked)}
                                        color="primary"
                                    />
                                }
                                label="Show excluded fields"
                                sx={{ m: 0 }}
                            />
                        )}
                    </RABox>
                    <RABox mb={2}>
                        <DataTable
                            table={{
                                // Columns are now stable (thanks to previous fix), so focus won't be lost
                                columns: columnsByTable[tbl.tableId],
                                rows: showExcluded
                                    ? tbl.attributes
                                    : tbl.attributes.filter((attr) => !attr.isExcluded),
                            }}
                            searchColumnKey="name"
                            searchPlaceholder="attributes"
                            onAddRow={() => addAttr(tbl.tableId)}
                            rowProps={getRowProps}
                        />
                    </RABox>
                </RABox>
            ))}
        </>
    );
}

export default DatasetTablesAssessment;