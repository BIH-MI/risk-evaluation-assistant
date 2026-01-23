import React, {useEffect, useState, useCallback, useMemo, useRef} from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { useAuth } from 'react-oidc-context';
import { useTheme } from '@mui/material/styles';

import RABox from 'components/layout/RABox';
import RATypography from 'components/display/RATypography';
import RAInput from 'components/input/RAInput';
import RAButton from 'components/input/RAButton';
import PaginatedQuestionnaire from 'components/input/RAQuestionnaire/PaginatedQuestionnaire';
import OnBlurRAInput from 'components/input/RAInput/OnBlurRAInput';
import DatasetTablesAssessment from 'components/display/Tables/DataTable/CustomDataTableComponents/DatasetTablesAssessment';
import RAAlert from 'components/feedback/RAAlert';

import {
    addDatasetAssessment,
    updateDatasetAssessment
} from 'store/datasetAssessments/datasetAssessmentsThunks';
import { fetchDatasets } from 'store/datasets/datasetsThunks';
import { useActiveLock } from "hooks/locks/useActiveLock";

export default function AddEditDatasetAssessmentForm() {
    const theme = useTheme();
    const dispatch = useDispatch();
    const navigate = useNavigate();
    const { user } = useAuth();
    const token = user?.access_token;

    const { datasetId: dsParam, assessmentId: asmtParam } = useParams();
    const datasetId = Number(dsParam);
    const assessmentId = asmtParam ? Number(asmtParam) : null;
    const isEditMode = assessmentId != null;

    const assessments = useSelector(s => s.datasetAssessments.items);
    const datasets = useSelector(s => s.datasets.items);
    const allQuestions = useSelector(s => s.questions.items || []);

    const assessment = useMemo(() => isEditMode ?
            assessments.find(a => a.id === assessmentId) : null,
        [assessments, assessmentId, isEditMode]
    );

    const dataset = useMemo(() =>
            datasets?.find(d => d.id === datasetId),
        [datasets, datasetId]
    );

    const questions = useMemo(() =>
            allQuestions.filter(q => q.type === 'IP'),
        [allQuestions]
    );

    // form state
    const [name, setName] = useState('');
    const [description, setDescription] = useState('');
    const [answers, setAnswers] = useState({});
    const [tables, setTables] = useState([]);
    const [isSubmitting, setIsSubmitting] = useState(false);

    // This prevents the form from resetting when Redux/Auth updates in the background
    const formInitialized = useRef(false);

    // We also track the ID to allow re-init if the user navigates from one assessment to another
    const initializedId = useRef(null);
    const currentTargetId = isEditMode ? assessmentId : `new-${datasetId}`;

    // --- LOCKING ---
    const [lockError, setLockError] = useState(null);

    const onLockFailed = useCallback((err) => {
        setLockError('Someone else is editing this dataset assessment.');
        setTimeout(() => navigate(`/datasets/${datasetId}/assessments`), 2000);
    }, [navigate, datasetId]);

    const hasLock = useActiveLock(
        'DATASET_ASSESSMENT',
        isEditMode ? String(assessmentId) : null,
        onLockFailed
    );

    const isReadOnly = (isEditMode && !hasLock) || isSubmitting;

    // --- Initialization Effect ---
    useEffect(() => {
        // Wait for data to be available
        if (!dataset) return;
        if (isEditMode && !assessment) return;

        // If we have already initialized the form for this specific ID, STOP.
         if (formInitialized.current && initializedId.current === currentTargetId) {
            return;
        }

        if (!isEditMode) {
            // CREATE MODE
            const nextIndex = (dataset.assessmentIds?.length || 0) + 1;
            setName(`${dataset.name} / Assessment ${nextIndex}`);
            setDescription('');
            setTables(
                (dataset.tables || []).map(tbl => ({
                    tableId: tbl.id,
                    tableName: tbl.name,
                    attributes: tbl.attributes.map(attr => ({
                        id: null,
                        name: attr.name,
                        attributeId: attr.id,
                        sensitivity: attr.excluded ? null : 2,
                        replicability: attr.excluded ? null : 2,
                        availability: attr.excluded ? null : 2,
                        distinguishability: attr.excluded ? null : 2,
                        isDirectIdentifier: attr.excluded ? null : false,
                        isExcluded: attr.excluded,
                    }))
                }))
            );
            setAnswers(Object.fromEntries(
                questions.map(q => [q.id, { id: null, answer: 'UNKNOWN' }])
            ));
        } else {
            // EDIT MODE
            setName(assessment.name);
            setDescription(assessment.description || '');

            const taMap = new Map((assessment.tableAssessments || []).map(ta => [ta.tableId, ta]));
            setTables(
                (dataset.tables || []).map(tbl => {
                    const ta = taMap.get(tbl.id);
                    const answered = new Map((ta?.attributes || []).map(a => [a.attributeId, a]));
                    return {
                        id: ta?.id ?? null,
                        tableId: tbl.id,
                        tableName: tbl.name,
                        attributes: tbl.attributes.map(attr => {
                            const asmAttr = answered.get(attr.id);
                            const excluded = attr.excluded;
                            return {
                                id: asmAttr?.id ?? null,
                                name: attr.name,
                                attributeId: attr.id,
                                sensitivity: excluded ? null : (asmAttr?.sensitivity ?? 2),
                                replicability: excluded ? null : (asmAttr?.replicability ?? 2),
                                availability: excluded ? null : (asmAttr?.availability ?? 2),
                                distinguishability: excluded ? null : (asmAttr?.distinguishability ?? 2),
                                isDirectIdentifier: excluded ? null : Boolean(asmAttr?.isDirectIdentifier),
                                isExcluded: excluded,
                            };
                        })
                    };
                })
            );
            setAnswers(Object.fromEntries(
                (assessment.answers || []).map(a => [a.questionId, { id: a.id, answer: a.answer }])
            ));
        }

        // Mark as initialized so subsequent renders don't wipe data
        formInitialized.current = true;
        initializedId.current = currentTargetId;

    }, [dataset, assessment, isEditMode, questions, currentTargetId]);

    const handleAnswerChange = useCallback((qid, ans) => {
        setAnswers(prev => ({ ...prev, [qid]: { id: prev[qid]?.id ?? null, answer: ans } }));
    }, []);

    const answerValues = React.useMemo(
        () => Object.fromEntries(Object.entries(answers).map(
            ([qid, { answer }]) => [Number(qid), answer]
        )),
        [answers]
    );

    const handleSubmit = async e => {
        e.preventDefault();

        if (isEditMode && !hasLock) {
            setLockError("Lost lock connectivity. Cannot save.");
            return;
        }

        setIsSubmitting(true);

        const payload = {
            name: name.trim(),
            description: description.trim(),
            answers: Object.entries(answers).map(([qid, { id, answer }]) => ({
                id, questionId: Number(qid), answer
            })),
            tableAssessments: tables.map(tbl => ({
                id: tbl.id,
                tableId: tbl.tableId,
                tableName: tbl.tableName,
                attributes: tbl.attributes
                    .filter(attr => !attr.isExcluded)
                    .map(attr => ({
                        id: attr.id,
                        attributeId: attr.attributeId,
                        sensitivity: attr.sensitivity,
                        replicability: attr.replicability,
                        availability: attr.availability,
                        distinguishability: attr.distinguishability,
                        isDirectIdentifier: attr.isDirectIdentifier,
                    }))
            }))
        };

        const action = isEditMode
            ? updateDatasetAssessment({ datasetId, assessmentId, updatedAssessment: payload, token })
            : addDatasetAssessment({ datasetId, newAssessment: payload, token });

        dispatch(action)
            .unwrap()
            .then(() => {
                dispatch(fetchDatasets(token));
                navigate('/datasets');
            })
            .catch(err => {
                setLockError(err.message || 'Save failed');
                setIsSubmitting(false);
            });
    };

    return (
        <>
            <RABox
                component="form"
                onSubmit={handleSubmit}
                sx={{
                    maxWidth: 1000,
                    mx: 'auto',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 2,
                    py: 4,
                }}
            >
                <RATypography variant="h5" textAlign="center">
                    {isEditMode ? 'Edit Dataset Assessment' : 'Create Dataset Assessment'}
                </RATypography>

                <RAInput label="Dataset" value={dataset?.name || ''} disabled fullWidth />

                <OnBlurRAInput
                    label="Assessment Name"
                    value={name}
                    onCommit={setName}
                    fullWidth
                    disabled={isReadOnly}
                />

                <OnBlurRAInput
                    label="Assessment Description (optional)"
                    value={description}
                    onCommit={setDescription}
                    fullWidth
                    multiline
                    rows={3}
                    disabled={isReadOnly}
                />

                <RABox my={3}>
                    <PaginatedQuestionnaire
                        title="Invasion-of-Privacy Questions"
                        questions={questions}
                        values={answerValues}
                        onChange={handleAnswerChange}
                        showRowNumbers
                        disablePagination={true}
                    />
                </RABox>

                <RATypography variant="h6" align="center" mt={2}>
                    Attribute Risk Assessment
                </RATypography>

                <DatasetTablesAssessment
                    tables={tables}
                    setTables={setTables}
                />

                <RAButton
                    type="submit"
                    variant="contained"
                    sx={{ alignSelf: 'center', mt: 3 }}
                    disabled={isReadOnly || !name.trim() || questions.some(q => answerValues[q.id] == null)}
                >
                    {isEditMode ? 'Update Assessment' : 'Create Assessment'}
                </RAButton>
            </RABox>

            {lockError && (
                <RABox
                    sx={{
                        position: 'fixed',
                        bottom: theme.spacing(2),
                        right: theme.spacing(2),
                        width: 300,
                        zIndex: theme.zIndex.snackbar,
                    }}
                >
                    <RAAlert color="error" dismissible onClose={() => setLockError(null)}>
                        <RATypography variant="body2" color="white">
                            Something went wrong. Please refresh page.
                        </RATypography>
                    </RAAlert>
                </RABox>
            )}
        </>
    );
}