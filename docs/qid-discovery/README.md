# QID Discovery Configuration Guide

This guide explains how REA helps researchers find direct identifiers and quasi-identifiers when a dataset is created, how administrators configure this, and what researchers see and decide in **Add Dataset**. It is written for researchers and administrators; technical details are in the [frontend](../../frontend/README.md) and [backend](../../backend/README.md) guides.

## Contents

1. [Overview](#1-overview)
2. [QID Discovery Configuration](#2-qid-discovery-configuration)
3. [AI-Assisted Direct-Identifier Detection](#3-ai-assisted-direct-identifier-detection)
4. [Administrator Model Management](#4-administrator-model-management)
5. [Enable or Disable AI Screening](#5-enable-or-disable-ai-screening)
6. [Researcher Workflow During Dataset Creation](#6-researcher-workflow-during-dataset-creation)
7. [Screening Results and Researcher Review](#7-screening-results-and-researcher-review)
8. [Statistical QID Profiling](#8-statistical-qid-profiling)
9. [Privacy and Data Handling](#9-privacy-and-data-handling)
10. [Limitations](#10-limitations)
11. [Technical References](#11-technical-references)

## 1. Overview

### Direct identifiers and quasi-identifiers

A **direct identifier** identifies a person on its own, for example a name, an email address or a health insurance number. Direct identifiers are normally removed or replaced before data are shared.

A **quasi-identifier** does not identify a person on its own, but can do so in combination with other attributes that an attacker might know or find elsewhere. Typical examples are age, sex, place of residence and dates of medical events.

| Attribute | Typical role |
| --- | --- |
| `email_address` | Potential direct identifier |
| `insurance_number` | Potential direct identifier |
| `age_at_diagnosis` | Potential quasi-identifier |
| `postal_area` | Geographic quasi-identifier; an area, not a full postal address |
| `date_of_diagnosis` | Potentially identifying in combination with other attributes |
| `critical_phase` (yes/no) | Clinical attribute; usually not identifying on its own |

Whether an attribute is a quasi-identifier depends on the context of the data release, not only on the attribute itself. Marking an attribute as a quasi-identifier does not mean that the dataset is unsafe; it means that the attribute must be considered when the re-identification risk is assessed and when anonymisation parameters are chosen.

### What QID Discovery does

QID Discovery runs while a dataset is being created in **Add Dataset**. It has two parts:

1. **Direct-identifier screening** flags attributes that look like direct identifiers, so that they can be excluded first (sections [3](#3-ai-assisted-direct-identifier-detection) and [7](#7-screening-results-and-researcher-review)).
2. **Statistical profiling** measures how strongly the remaining attributes, alone and in combination, distinguish the records of the uploaded table (section [8](#8-statistical-qid-profiling)).

Direct identifiers are screened first because they would distort the profiling: an attribute that is unique for every record makes every combination containing it look highly distinguishing, which hides the contribution of the actual quasi-identifiers.

Automated evidence and researcher decisions work together. REA proposes exclusions and flags attributes for review; the researcher makes the final decision for each attribute, within the safeguards described in section [7](#7-screening-results-and-researcher-review).

### Place in the REA workflow

The profiling results are stored with the dataset as aggregate statistics. In the later **Dataset Assessment**, they are shown as Distinguishability evidence while the researcher scores each attribute; the scores determine which attributes are marked as quasi-identifiers. Together with the recipient assessment, REA then recommends an anonymisation threshold for a data-sharing activity.

## 2. QID Discovery Configuration

Administrators manage configurations under **Configuration → QID Discovery**. The list shows each configuration with its status (Active, Archived, Default) and provides actions to edit, duplicate, set as default and archive. Only administrators can manage configurations; researchers can select any active configuration in Add Dataset.

### Configuration Details

| Setting | Meaning |
| --- | --- |
| **Name** | Unique name shown to researchers when they select a configuration. |
| **Description** | Optional explanation of the configuration's purpose. |
| **Version** | Version number of the saved settings (read-only, see below). |
| **Active** | Only active configurations can be selected for new datasets. Archiving a configuration keeps the settings of existing datasets. |
| **Default** | The default configuration is preselected in Add Dataset. Only an active configuration can be the default, and there is one default at a time. |

### Subset Profiling

| Setting | Meaning | Default |
| --- | --- | --- |
| **Maximum subset size** | The largest number of attributes considered together. With 4, REA evaluates combinations of 2, 3 and 4 attributes. | 4 |
| **Maximum evaluated subsets** | A safety limit on the number of combinations, to keep the computation in the browser manageable. | 25,000 |

REA evaluates **every** combination up to the maximum subset size. It does not sample or stop part-way: if the number of combinations for a table would exceed the maximum evaluated subsets, profiling of that table fails with an error, and the researcher can exclude attributes, or an administrator can lower the subset size or raise the limit. See section [8](#8-statistical-qid-profiling) for an example.

### AI-Assisted Direct-Identifier Detection

The same form contains the AI screening settings, described in sections [4](#4-administrator-model-management) and [5](#5-enable-or-disable-ai-screening).

### Versioning

Every time a configuration is saved, REA stores its settings as a new version. A dataset keeps a reference to the version that was used when it was created. Later changes to the configuration, or archiving it, therefore never change the settings recorded for existing datasets.

The default configuration, **REA Default QID Discovery**, is created automatically when REA is first started. It uses the default values above and has AI screening enabled with DeBERTaV3-XSmall as the only and default model. Administrators can edit it like any other configuration; REA does not overwrite their changes.

## 3. AI-Assisted Direct-Identifier Detection

Direct-identifier screening combines three sources of evidence. Each source can be wrong, so they are kept separate and shown separately in the screening details of each attribute.

### A. AI-assisted classification

A pretrained language model reads the **column name** and assigns it to one of a fixed set of categories: eight identifier categories (person name, email address, telephone number, postal address, national ID number, medical record number, health insurance number, IP address) and four others (demographic, clinical, administrative, and an "unnamed or coded variable" category for names such as `var_023`).

- **Zero-shot natural language inference.** The model was not trained on REA data. For each category, it judges how well a sentence such as "This column contains an email address." follows from the column name.
- **Browser-local inference.** The model runs in the researcher's browser (Transformers.js with ONNX Runtime). The model files are installed on the REA server, but classification never takes place on the server or at an external service.
- **Input.** Only the column name is classified. The classifier also accepts an optional researcher-written description, but Add Dataset currently provides no field for entering one. Data values are never given to the model.
- **Uncertainty.** A prediction counts as confident only when one category clearly outscores the others. Otherwise the result is uncertain. The scores are not calibrated probabilities.
- **Validation status.** What a prediction may do depends on whether the model has been evaluated and approved in its exact configuration (section [4](#4-administrator-model-management)). Currently, no model can exclude an attribute on its own: identifier predictions are always suggestions for review.

### B. Column-name rules

Fixed rules compare the whole column name, after normalisation (for example `PatientEmail`, `patient_email` and `patient-email` are treated alike), with known phrases. They work independently of the model and also when AI screening is disabled.

| Kind | Examples | Effect |
| --- | --- | --- |
| Strong identifier names | `email_address`, `insurance_number`, `patient_name`, `phone_number`, `ssn` | Excluded automatically. |
| Ambiguous identifier names | `name`, `address`, `record_id`, `subject_id`, `case_number` | Always flagged for review; never excluded automatically. Record keys are often pseudonymous. |
| Names about an identifier | `email_consent`, `insurance_type` | No effect on their own; an AI identifier prediction becomes a review instead of an exclusion. |
| Quasi-identifier names | `postal_area`, `zip_code`, `age_at_diagnosis`, `date_of_diagnosis`, `sex` | No effect on their own; an AI identifier prediction becomes a review instead of an exclusion. |

A name such as `postal_area` contains a geographic word, but a postal area is a region shared by many people, not a full address. The rules therefore treat it as a geographic quasi-identifier: even if the model suggests "postal address", it is flagged for review and never excluded automatically.

### C. Value-pattern evidence

The observed values of each column are checked locally in the browser with regular expressions for email addresses, telephone numbers, IPv4/IPv6 addresses and US social security numbers. A column needs enough non-missing values before a pattern counts.

| Level | When | Effect |
| --- | --- | --- |
| High-confidence match | Nearly all analysed values match one pattern (at least 80%; 85% for telephone numbers). | Excluded automatically; the attribute must stay excluded for the dataset to be created. |
| Ambiguous match | A substantial share matches (at least 50%; 60% for telephone numbers), but not enough for a high-confidence match. | Flagged for review. |

### How the sources interact

- Evidence from any source can lead to an exclusion or a review; no source can make an attribute "safe".
- The AI model never overrides deterministic evidence by itself. If the model confidently disagrees with a strong identifier name, the attribute is not excluded automatically but flagged for review, and only a model evaluated in its exact configuration can cause this. An unevaluated model's disagreement is ignored.
- A favourable AI result ("no exclusion suggested") is not evidence that an attribute is free of identifiers. Ambiguous names and value-pattern findings are flagged for review regardless of the model.
- Value-pattern evidence is judged separately from the column name and the model.

## 4. Administrator Model Management

The AI settings are in **Configuration → QID Discovery → Edit Configuration → AI-Assisted Direct-Identifier Detection**:

| Setting | Meaning |
| --- | --- |
| **Enable AI screening** | Switches AI classification on or off for datasets created with this configuration. |
| **Available models** | The models researchers may use. Only installed models can be added. |
| **Default AI model** | Preselected in Add Dataset; it must be one of the available models. |
| **Install / Retry installation** | Installs a model on the server, shown next to each model with its installation status. |

When AI screening is enabled, at least one model and a default must be selected before the configuration can be saved.

### Supported models

| Model | Installed by default | Validation status |
| --- | --- | --- |
| DeBERTaV3-XSmall | Yes | Evaluated; not approved for automatic exclusion |
| MobileBERT-MNLI | No | Not evaluated |
| DistilBERT-MNLI | No | Not evaluated |

These statuses describe different things:

- **Supported:** this REA version can run the model.
- **Installed:** the model files are present on this server. A supported model must be installed before it can be offered.
- **Evaluated:** the model has been tested on labelled column names in its exact configuration (model version, prompt and thresholds). The evaluation of DeBERTaV3-XSmall is recorded in the [model registry](../../frontend/src/qidDiscovery/aiSuggestions/modelRegistry.json). For an evaluated model, a confident disagreement with a strong identifier name sends the attribute to review (section [3](#3-ai-assisted-direct-identifier-detection)).
- **Approved for automatic exclusion:** the evaluation supports letting the model exclude attributes on its own. No model currently has this status.

The model list in the configuration form shows each model's validation status. MobileBERT-MNLI and DistilBERT-MNLI have not been evaluated for this application; their identifier predictions are always suggestions for review, and their other results are shown as uncertain and never overrule column-name or value-pattern evidence.

### Installation

Model files are installed centrally by the REA backend, which downloads them from a fixed source at a fixed version, checks every file against a recorded checksum and stores them persistently. Installation applies to the whole deployment, not to a single configuration. The browsers of researchers then load the model from the REA server and run it locally.

The default model is installed automatically when REA starts. Other models are installed with **Install**; a progress indicator is shown while the files are downloaded. If installation fails (for example because the server has no internet access or not enough storage), the status shows **Installation failed** with a short reason, and **Retry installation** starts again. A failed or interrupted installation is never used. Deployment settings such as proxies, mirrors and offline installation are described in the [backend guide](../../backend/README.md#ai-model-installation).

## 5. Enable or Disable AI Screening

**When AI screening is enabled:**

- administrators select the available (installed) models and the default model;
- researchers can use the models allowed by the configuration (section [6](#6-researcher-workflow-during-dataset-creation)).

**When AI screening is disabled:**

- the model list and the default model are greyed out, and the form shows "AI-assisted screening is disabled. Model settings are retained but will not be used.";
- the existing model selection is kept and is used again when screening is re-enabled;
- Add Dataset hides the model selection and loads no AI model;
- column-name rules, value-pattern checks, manual exclusion and statistical profiling continue to work;
- attributes without name or value evidence are shown as not screened by AI.

Disabling AI screening does not uninstall any model. Installation remains available in the form, and installed models stay on the server.

## 6. Researcher Workflow During Dataset Creation

1. Open **Add Dataset**.
2. Enter the dataset name and, optionally, a description and the users to share it with.
3. Select a **QID Discovery Configuration**. The default configuration is preselected; only active configurations are listed.
4. Check the **AI Model** field (shown only when AI screening is enabled). If the configured default is the only usable model, it is used automatically. If several models are usable, choose one; the configured default is preselected.
5. Upload a CSV file.
6. Wait while REA prepares the data. The file is parsed and profiled in the browser, and AI screening starts as soon as the column names are known. A progress line shows the model loading and the classification of each attribute.
7. Examine the attribute preview: each attribute shows its name, data type, example values, the **Excluded** checkbox and a screening-status icon. The line above the table summarises the classification and how many attributes require review.
8. Review the potential direct identifiers (section [7](#7-screening-results-and-researcher-review)).
9. Exclude attributes, or confirm that they should stay included, as appropriate.
10. Check the updated profiling summary, which is recomputed whenever an exclusion changes.
11. Select **Create Dataset** once all required decisions are made.

**Model selection is locked after a table has been added**, so that all tables of a dataset are screened by the same model. Remove all tables to change the model.

**An unavailable default model is not replaced silently.** If the configured default is not installed, REA explains why. When several other models are available, the researcher chooses one; otherwise no model is used, and the attributes must be reviewed manually.

**Exclusions affect profiling.** Excluded attributes are omitted from the combinations that are profiled. When an exclusion changes, the profiling of that table is recomputed. While attributes still await review, the profiling summary is marked as provisional.

**Submission requires certain decisions** (details in section [7](#7-screening-results-and-researcher-review)). If an included attribute still has an unresolved potential identifier finding, selecting **Create Dataset** shows a message listing the attributes concerned. Uncertain AI results without such a finding do not block submission.

**Screening failures and timeouts.** If the model cannot be loaded, screening fails, or the AI component stops responding for two minutes, the progress line reports it and the affected attributes are shown as not screened, with the reason. Column-name rules and value-pattern checks still apply. Profiling of a table waits at most 30 seconds for AI screening; AI results that arrive later are displayed but not applied automatically, and a late identifier suggestion then requires review before submission.

## 7. Screening Results and Researcher Review

Each attribute has one status icon next to its **Excluded** checkbox. Hovering over it shows the screening details: the predicted category, the evidence that produced the result (column-name rule, AI suggestion, value pattern) and a short explanation. Clicking it opens the same details with a confirmation button where applicable.

| Status | Meaning |
| --- | --- |
| **Auto-excluded** | Excluded automatically because of a strong identifier name or a high-confidence value pattern. |
| **Review needed** | The attribute is included, but there is a potential identifier finding that needs a decision. |
| **Reviewed** | The researcher has decided: changed the checkbox or confirmed the current state. |
| **No exclusion suggested** | No evidence of a direct identifier. The details explain when the AI result was uncertain. The attribute is still profiled as a possible quasi-identifier. |
| **Not screened** | AI screening was not performed or failed for this attribute (for example, disabled, model unavailable or timed out), and no name or value evidence applies. Tables added manually instead of uploaded are not screened at all. |
| **Screening…** | Classification is still running. |

### Kinds of decisions

- **Automatic exclusion:** REA excludes the attribute without a researcher action, based on a strong identifier name or a high-confidence value pattern.
- **Suggested exclusion:** the AI or the rules consider the attribute a potential identifier but do not exclude it; it is shown as **Review needed**.
- **Manual exclusion:** the researcher ticks or clears the **Excluded** checkbox. This always counts as a decision.
- **Explicit confirmation:** in the details, **Confirm exclusion** (for an excluded attribute) or **Keep included** (for an included one) records the decision without changing the checkbox.
- **Included after review:** an attribute kept with **Keep included** stays in the profiling and is no longer flagged.

### Which decisions are required

| Situation | Required before **Create Dataset** |
| --- | --- |
| An included attribute shows **Review needed** | Yes: exclude it, or choose **Keep included**. |
| A high-confidence value-pattern match | Yes: the attribute must remain excluded. |
| AI screening is still running | Yes: wait until it has finished. |
| An attribute was excluded automatically by a name rule | No; confirming is optional, and clearing the checkbox reverses the exclusion. |
| An AI result is uncertain without a finding | No. |

Automatic exclusions based on column names can be reversed by clearing the **Excluded** checkbox. Because excluded attributes are omitted from subset profiling, every exclusion decision changes which attributes contribute to the Distinguishability evidence.

## 8. Statistical QID Profiling

Statistical profiling is separate from direct-identifier screening. It does not use the AI model and does not estimate re-identification risk; it measures how strongly attributes distinguish the records of the uploaded table.

### Single attributes

For every attribute with observed data, REA computes, among others:

- **Distinction:** the number of distinct values divided by the number of records. A value close to 1 means almost every record has its own value.
- **Separation:** the share of all pairs of records that have different values.
- **Singleton fraction:** the share of records whose value occurs only once in the table.

Missing values are counted as one value of their own.

### Attribute combinations

Attributes that are harmless on their own can be distinguishing together. For example, in a table of 10,000 patients, age at diagnosis, sex, postal area and date of diagnosis each take many records per value; the combination "52 years, female, postal area 10115, diagnosed on 3 March" may describe a single patient.

REA therefore evaluates every combination of 2 up to the **maximum subset size** of the eligible attributes, computes the same measures for each combination, and summarises them per attribute: for each subset size, the mean distinction, separation and singleton fraction of all combinations containing that attribute.

Eligible attributes are those that are included, contain observed data and have no high-confidence value-pattern identifier. Direct identifiers are left out because a unique identifier makes every combination containing it maximally distinguishing, which would hide the contribution of the other attributes.

### Profiling limit

The number of combinations grows quickly with the number of attributes. With a maximum subset size of 4:

| Eligible attributes | Combinations of 2–4 attributes |
| --- | --- |
| 20 | 6,175 |
| 30 | 31,900 |

With the default limit of 25,000 evaluated subsets, the 20-attribute table is profiled, while profiling of the 30-attribute table stops with an error that states the required number of combinations. REA does not profile only part of the combinations. Excluding attributes, a smaller maximum subset size or a higher limit resolves this.

### Use of the results

The profiling summary under each preview table states how many combinations were evaluated across how many eligible attributes. The statistics are stored with the dataset and shown as **Distinguishability Evidence** in the Dataset Assessment, where the researcher scores each attribute. They describe the uploaded table only; whether an attribute is a quasi-identifier also depends on whether it is replicable and available to an attacker.

## 9. Privacy and Data Handling

| Data | Processed by | Where |
| --- | --- | --- |
| Column names | AI model, column-name rules | Researcher's browser |
| Observed values | Value-pattern rules, statistical profiling | Researcher's browser |
| Model files | Installation and checksum verification | REA server, then loaded by the browser |

- **AI model.** Classification runs in a background worker in the researcher's browser and receives only column names. Column names and data values are not sent to external services for classification.
- **CSV contents.** The uploaded file is parsed and analysed in the browser. Raw rows, example values and per-combination results are not sent to the REA server.
- **What is stored.** When the dataset is created, the browser sends the usual application data to the REA server: dataset name and description, sharing, table and attribute names, data types, exclusion decisions, the aggregate statistics of section [8](#8-statistical-qid-profiling), and a summary of value-pattern evidence per attribute (source, concept, confidence). AI suggestions and the individual review steps are not stored; their outcome is reflected in the exclusion decisions.
- **Configuration and model provenance.** The dataset records the QID Discovery configuration version and, if a model classified at least one attribute, the model, its version, the prompt and threshold versions and its validation status. The server checks this information against its own model registry and derives the validation status itself, but the information is reported by the browser: it shows which configuration was reported, not independent proof of which model actually ran.

## 10. Limitations

- **False positives and false negatives.** All three sources can miss identifiers or flag harmless attributes. Unusual, abbreviated or coded column names (for example `pt_ref`, `var_023`) are particularly difficult.
- **Dependence on column names.** The AI model and the rules see only names. A column called `notes` can contain names or addresses; a column called `email` can contain consent flags.
- **Ambiguous semantics.** Names such as `id` or `record_number` may be direct identifiers or pseudonymous keys; REA flags them for review rather than deciding.
- **Regular expressions** recognise formats, not meaning: they cannot recognise names or free-text addresses, can match values that only look like identifiers, and cover only the listed patterns (national identifiers only in the US social security number format).
- **Statistical profiling** describes the uploaded table, not the population or what an attacker knows. High Distinguishability does not prove that an attribute is a quasi-identifier, and low Distinguishability does not prove that it is safe.
- **Evaluated and unevaluated models.** DeBERTaV3-XSmall has been evaluated on a limited set of labelled column names; MobileBERT-MNLI and DistilBERT-MNLI have not been evaluated. No model is approved for model-based automatic exclusion.
- **Expert judgement.** AI screening is decision support. It cannot replace the researcher's knowledge of the data and its context, and REA does not guarantee that a dataset is anonymous or safe to share.

## 11. Technical References

- [Root README](../../README.md): overview and installation
- [Frontend guide](../../frontend/README.md#ai-assisted-direct-identifier-screening): model registry, prompts, screening logic, adding a model
- [Backend guide](../../backend/README.md#ai-model-installation): model installation, storage, deployment settings, provenance checks
- [Shared model registry](../../frontend/src/qidDiscovery/aiSuggestions/modelRegistry.json)
- [AI screening implementation](../../frontend/src/qidDiscovery/aiSuggestions/)
- [Add Dataset integration](../../frontend/src/screens/datasets/AddDatasetForm/)
- [Statistical profiling](../../frontend/src/qidDiscovery/)
- [QID Discovery configuration screens](../../frontend/src/screens/qidDiscoveryConfiguration/)
