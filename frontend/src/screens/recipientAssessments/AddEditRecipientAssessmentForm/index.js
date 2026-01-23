import PersonOutlineIcon from '@mui/icons-material/PersonOutline';
import ApartmentIcon from '@mui/icons-material/Apartment';
import LinkIcon from '@mui/icons-material/Link';
import EmailOutlinedIcon from '@mui/icons-material/EmailOutlined';
import PhoneOutlinedIcon from '@mui/icons-material/PhoneOutlined';
import InputAdornment from '@mui/material/InputAdornment';

import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from 'react-oidc-context';
import { useDispatch, useSelector } from 'react-redux';
import { useTheme } from '@mui/material/styles';

import RABox from 'components/layout/RABox';
import RATypography from 'components/display/RATypography';
import RAInput from 'components/input/RAInput';
import RAButton from 'components/input/RAButton';
import OnBlurRAInput from 'components/input/RAInput/OnBlurRAInput';
import PaginatedQuestionnaire from 'components/input/RAQuestionnaire/PaginatedQuestionnaire';
import {
    addRecipientAssessment,
    updateRecipientAssessment
} from 'store/recipientAssessments/recipientAssessmentsThunks';
import { fetchRecipients } from 'store/recipients/recipientsThunks';
import RAAlert from "../../../components/feedback/RAAlert";
import {FormControlLabel} from "@mui/material";
import Checkbox from "@mui/material/Checkbox";
import { useActiveLock } from "hooks/locks/useActiveLock";

export default function AddEditRecipientAssessmentForm() {
    const theme = useTheme();
    const navigate = useNavigate();
    const dispatch = useDispatch();
    const { user } = useAuth();
    const token = user?.access_token;

    // — mode & URL params —
    const { recipientId: rId, assessmentId: aId } = useParams();
    const recipientId = Number(rId);
    const assessmentId = aId ? Number(aId) : null;
    const isEditMode = assessmentId != null;

    // — lookup recipient
    const recipients = useSelector(s => s.recipients.items || []);
    const { items: allAssessments } = useSelector(s => s.recipientAssessments);
    const allQuestions = useSelector(s => s.questions.items || []);

    // Memoize derived data
    const recipient = useMemo(() =>
        recipients.find(r => r.id === recipientId) || {},
      [recipients, recipientId]
    );
    const assessmentsForRecipient = useMemo(() =>
        allAssessments.filter(a => a.recipientId === recipientId),
      [allAssessments, recipientId]
    );
    const currentAssessment = useMemo(() =>
        assessmentsForRecipient.find(a => a.id === assessmentId),
      [assessmentsForRecipient, assessmentId]
    );

    const mitcQuestions = useMemo(() => allQuestions.filter(q => q.type === 'MITC'), [allQuestions]);
    const motcQuestions = useMemo(() => allQuestions.filter(q => q.type === 'MOTC'), [allQuestions]);

    // — form state —
    const [organization, setOrganization] = useState('');
    const [name, setName] = useState('');
    const [assessmentNameError, setAssessmentNameError] = useState(false);
    const [description, setDescription] = useState('');
    const [contactName, setContactName] = useState('');
    const [email, setEmail] = useState('');
    const [telephone, setTelephone] = useState('');
    const [department, setDepartment] = useState('');
    const [departmentLink, setDepartmentLink] = useState('');
    const [answers, setAnswers] = useState({});
    const [showContactInfo, setShowContactInfo] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);

    // --- INITIALIZATION GUARD ---
    const formInitialized = useRef(false);
    const initializedId = useRef(null);
    const currentTargetId = isEditMode ? assessmentId : `new-${recipientId}`;

    // --- LOCKING LOGIC ---
    const [lockError, setLockError] = useState(null);

    const onLockFailed = useCallback((err) => {
        setLockError("Someone else is editing this recipient assessment.");
        setTimeout(() => navigate(`/recipients/${recipientId}/assessments`), 2000);
    }, [navigate, recipientId]);

    const hasLock = useActiveLock(
      'RECIPIENT_ASSESSMENT',
      isEditMode ? String(assessmentId) : null,
      onLockFailed
    );

    // Form is read-only if editing without lock OR submitting
    const isReadOnly = (isEditMode && !hasLock) || isSubmitting;

    // — Initialization Effect —
    useEffect(() => {
        if (!recipient.id) return;
        if (isEditMode && !currentAssessment) return;

        if (formInitialized.current && initializedId.current === currentTargetId) {
            return;
        }

        if (isEditMode) {
            // EDIT MODE
            setOrganization(recipient.name || '');
            setName(currentAssessment.name || '');
            setDescription(currentAssessment.description || '');
            setContactName(currentAssessment.contactName || '');
            setEmail(currentAssessment.email || '');
            setTelephone(currentAssessment.telephone || '');
            setDepartment(currentAssessment.department || '');
            setDepartmentLink(currentAssessment.departmentLink || '');
            setAnswers(Object.fromEntries(
              (currentAssessment.answers || []).map(({ id, questionId, answer }) => [
                  questionId,
                  { id, answer }
              ])
            ));
            if (currentAssessment.contactName || currentAssessment.email ||
              currentAssessment.telephone || currentAssessment.department) {
                setShowContactInfo(true);
            }
        } else {
            // CREATE MODE
            setOrganization(recipient.name || '');
            const nextIndex = (assessmentsForRecipient?.length || 0) + 1;
            setName(`${recipient.name || 'Recipient'} / Assessment ${nextIndex}`);
            setDescription('');
            setContactName('');
            setEmail('');
            setTelephone('');
            setDepartment('');
            setDepartmentLink('');

            // Default to 'UNKNOWN'
            const allRelevantQuestions = [...mitcQuestions, ...motcQuestions];
            setAnswers(Object.fromEntries(
              allRelevantQuestions.map(q => [q.id, { answer: 'UNKNOWN' }])
            ));
        }

        formInitialized.current = true;
        initializedId.current = currentTargetId;

    }, [isEditMode, currentAssessment, recipient, mitcQuestions, motcQuestions, assessmentsForRecipient, currentTargetId]);

    // — answer change handler →
    const handleAnswerChange = useCallback((qid, ans) => {
        // FIX: Removed "Kill Switch" dependency logic.
        // Questions are now completely independent.
        setAnswers(prev => ({
            ...prev,
            [qid]: { ...prev[qid], answer: ans }
        }));
    }, []);

    // — assessment name blur handler →
    const handleCommitAssessmentName = useCallback(val => {
        setName(val);
        if (assessmentNameError && val.trim()) setAssessmentNameError(false);
    }, [assessmentNameError]);

    // — form submit
    const handleSubmit = useCallback(e => {
        e.preventDefault();

        if (isEditMode && !hasLock) {
            setLockError("Lost lock connectivity. Cannot save.");
            return;
        }

        let valid = true;
        if (!name.trim()) {
            setAssessmentNameError(true);
            valid = false;
        }
        if (!valid) return;

        setIsSubmitting(true);

        const payload = {
            name: name.trim(),
            description,
            contactName,
            email,
            telephone,
            department,
            departmentLink,
            answers: Object.entries(answers).map(([qid, { id, answer }]) => ({
                id,
                questionId: Number(qid),
                answer
            }))
        };

        const thunk = isEditMode
          ? updateRecipientAssessment({ recipientId, assessmentId, updatedAssessment: payload, token })
          : addRecipientAssessment({ recipientId, newAssessment: { recipientId, ...payload }, token });

        dispatch(thunk)
          .unwrap()
          .then(() => {
              dispatch(fetchRecipients(token));
              navigate('/recipients');
          })
          .catch(err => {
              console.error(err);
              setIsSubmitting(false);
          });
    }, [
        isEditMode, recipientId, assessmentId, token,
        name, description, contactName, email, telephone, department, departmentLink,
        answers, dispatch, navigate, hasLock
    ]);

    const allAnswered = name.trim() &&
      [...mitcQuestions, ...motcQuestions].every(q => answers[q.id]?.answer != null);

    return (
      <>
          <RABox py={8}>
              <RABox
                component="form"
                onSubmit={handleSubmit}
                sx={{
                    maxWidth: '80%',
                    mx: 'auto',
                    display: 'flex', flexDirection: 'column', gap: 2
                }}
              >
                  <RATypography variant="h5" textAlign="center">
                      {isEditMode ? 'Edit' : 'Add'} Recipient Assessment
                  </RATypography>

                  <RAInput
                    label="Recipient"
                    value={organization}
                    disabled
                    fullWidth
                  />

                  <OnBlurRAInput
                    label="Assessment Name"
                    value={name}
                    onCommit={handleCommitAssessmentName}
                    fullWidth
                    required
                    error={assessmentNameError}
                    helperText={assessmentNameError ? 'Assessment name is required.' : ''}
                    disabled={isReadOnly}
                  />

                  <OnBlurRAInput
                    label="Description (optional)"
                    value={description}
                    onCommit={setDescription}
                    fullWidth
                    multiline
                    rows={3}
                    disabled={isReadOnly}
                  />

                  <FormControlLabel
                    control={
                        <Checkbox
                          checked={showContactInfo}
                          onChange={e => setShowContactInfo(e.target.checked)}
                          disabled={isReadOnly}
                        />
                    }
                    label="Contact Information"
                    sx={{ mt: 2 }}
                  />

                  {showContactInfo && (
                    <RABox sx={{ border:'1px solid', borderColor:'divider', backgroundColor:'background.paper', p:3, mt:2, borderRadius:1 }}>
                        <RATypography variant="h6" textAlign="center" gutterBottom>
                            Contact Information
                        </RATypography>
                        <RABox sx={{ display:'flex', flexDirection:'column', gap:2 }}>
                            <OnBlurRAInput
                              label="Contact Name"
                              value={contactName}
                              onCommit={setContactName}
                              fullWidth
                              disabled={isReadOnly}
                              InputProps={{
                                  startAdornment:(<InputAdornment position="start"><PersonOutlineIcon color="action"/></InputAdornment>)
                              }} />
                            <RAInput
                              label="Department"
                              value={department}
                              onChange={e=>setDepartment(e.target.value)}
                              fullWidth
                              disabled={isReadOnly}
                              InputProps={{
                                  startAdornment:(<InputAdornment position="start"><ApartmentIcon color="action"/></InputAdornment>)
                              }} />
                            <RAInput
                              label="Department Link"
                              value={departmentLink}
                              onChange={e=>setDepartmentLink(e.target.value)}
                              fullWidth
                              disabled={isReadOnly}
                              InputProps={{
                                  startAdornment:(<InputAdornment position="start"><LinkIcon color="action"/></InputAdornment>)
                              }} />
                            <OnBlurRAInput
                              label="Email"
                              value={email}
                              onCommit={setEmail}
                              fullWidth
                              disabled={isReadOnly}
                              InputProps={{
                                  startAdornment:(<InputAdornment position="start"><EmailOutlinedIcon color="action"/></InputAdornment>)
                              }} />
                            <RAInput
                              label="Telephone"
                              value={telephone}
                              onChange={e=>setTelephone(e.target.value)}
                              fullWidth
                              disabled={isReadOnly}
                              InputProps={{
                                  startAdornment:(<InputAdornment position="start"><PhoneOutlinedIcon color="action"/></InputAdornment>)
                              }} />
                        </RABox>
                    </RABox>
                  )}


                  {/* Mitigating Controls */}
                  <RABox width="100%" my={5}>
                      <PaginatedQuestionnaire
                        title="Mitigating Controls Questions"
                        questions={mitcQuestions} // Pass direct list, no disabled logic
                        values={Object.fromEntries(
                          Object.entries(answers).map(([qid, { answer }]) => [Number(qid), answer])
                        )}
                        onChange={handleAnswerChange}
                        disablePagination
                        showRowNumbers
                        sx={{ width: '100%' }}
                      />
                  </RABox>

                  {/* Motives & Capacity */}
                  <RABox width="100%" my={5}>
                      <PaginatedQuestionnaire
                        title="Motives and Capacity Questions"
                        questions={motcQuestions} // Pass direct list, no disabled logic
                        values={Object.fromEntries(
                          Object.entries(answers).map(([qid, { answer }]) => [Number(qid), answer])
                        )}
                        onChange={handleAnswerChange}
                        disablePagination
                        showRowNumbers
                        sx={{ width: '100%' }}
                      />
                  </RABox>

                  <RAButton
                    type="submit"
                    sx={{ alignSelf: 'center', mt: 2 }}
                    disabled={!allAnswered || isReadOnly}
                  >
                      {isEditMode ? 'Edit Assessment' : 'Create Assessment'}
                  </RAButton>
              </RABox>
          </RABox>
          {lockError && (
            <RABox
              sx={{
                  position: 'fixed',
                  bottom: 16,
                  right: 16,
                  width: 300,
                  zIndex: theme => theme.zIndex.snackbar
              }}
            >
                <RAAlert color="error" dismissible onClose={() => setLockError(null)}>
                    <RATypography variant="body2" color="white">
                        {lockError}
                    </RATypography>
                </RAAlert>
            </RABox>
          )}
      </>

    );
}