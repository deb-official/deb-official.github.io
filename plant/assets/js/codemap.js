// Theory-to-code map. One entry per idea in the paper.
// To annotate an entry, fill in: file (path in the repo), url (link to the lines on GitHub),
// start (first line number), code (the snippet, verbatim), hl (line numbers to highlight),
// and optionally notes (short strings, one per highlighted idea).
// Entries without `code` render as "coming soon". `concept` matches data-concept="…" in index.html.
window.PLANT_CODEMAP = [
  { concept: "mig", title: "Mutual information gain", where: "Appendix B · precomputed once per dataset",
    tex: "r_{lj}=\\sum_{x,y}P(x,y)\\log\\frac{P(x,y)}{P(x)P(y)}",
    file: null, url: null, start: 1, code: null, hl: [], notes: [] },
  { concept: "architecture", title: "Label attention on the LLM's outputs", where: "Section 2 · Eq. 1",
    tex: "\\mathbf{A},\\mathbf{S}=\\mathsf{MultiHead}(\\mathbf{E},\\mathbf{H}_i,\\mathbf{H}_i;\\mathbf{W}_{\\mathsf{attn}})",
    file: null, url: null, start: 1, code: null, hl: [], notes: [] },
  { concept: "rank-loss", title: "Stage 1 ranking loss", where: "Section 2 · Eq. 2",
    tex: "-\\sum_{j,h}|\\Delta\\mathsf{nDCG@k}|_{jh}\\,\\log_2\\big(1+e^{-\\sigma(s_{lj}-s_{lh})}\\big)^{-1}",
    file: null, url: null, start: 1, code: null, hl: [], notes: [] },
  { concept: "head", title: "Boost, pool and classify", where: "Section 2",
    tex: "\\hat{\\mathbf{y}}_i=\\mathsf{Pool}(\\mathbf{B}_a+\\mathbf{A}\\odot\\mathbf{B}_m)\\,\\mathbf{W}_c",
    file: null, url: null, start: 1, code: null, hl: [], notes: [] },
  { concept: "focal", title: "Stage 2 focal loss with hard negatives", where: "Section 2 · Appendix A, Eq. 3",
    tex: "\\mathcal{L}_{\\mathsf{focal}}\\ \\text{over}\\ \\mathcal{S}_i=\\{\\text{positives}\\}\\cup\\{\\text{top-}m\\text{ negatives}\\}",
    file: null, url: null, start: 1, code: null, hl: [], notes: [] },
  { concept: "two-stage", title: "The two-stage schedule", where: "Section 3 · Appendix A",
    tex: "\\text{Stage 1 (}\\le 10\\text{ epochs, nDCG@k)}\\;\\rightarrow\\;\\text{Stage 2 (}\\le 20\\text{ epochs, Macro-F1)}",
    file: null, url: null, start: 1, code: null, hl: [], notes: [] }
];
