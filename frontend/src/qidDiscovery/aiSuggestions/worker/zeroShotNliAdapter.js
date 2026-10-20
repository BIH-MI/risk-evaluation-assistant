/*
 * Zero-shot NLI classification adapter. Each candidate label is inserted into
 * each hypothesis template and scored for entailment against the column text;
 * scores are softmaxed over the labels and averaged over the templates.
 *
 * Adapters share one contract, so other strategies (e.g. sentence-embedding
 * similarity) can be added as separate adapters without changing the worker:
 *
 *   classify(classifier, { text, candidateLabels, hypothesisTemplates })
 *     -> Promise<{ labels: string[], scores: number[] }>  (highest first)
 *
 * `classifier` is the Transformers.js pipeline loaded for the model's `task`.
 */
export const zeroShotNliAdapter = Object.freeze({
  task: "zero-shot-classification",

  async classify(classifier, { text, candidateLabels, hypothesisTemplates }) {
    const averagedScores = new Map(candidateLabels.map((label) => [label, 0]));
    for (const template of hypothesisTemplates) {
      const output = await classifier(text, candidateLabels, {
        hypothesis_template: template,
        multi_label: false,
      });
      output.labels.forEach((label, labelIndex) => {
        averagedScores.set(
          label,
          averagedScores.get(label) +
            output.scores[labelIndex] / hypothesisTemplates.length
        );
      });
    }

    const ranked = Array.from(averagedScores.entries()).sort(
      (left, right) => right[1] - left[1]
    );
    return {
      labels: ranked.map(([label]) => label),
      scores: ranked.map(([, score]) => score),
    };
  },
});
