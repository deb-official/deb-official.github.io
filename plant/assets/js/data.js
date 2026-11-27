// Every number here is copied from the NeurIPS 2026 camera-ready (sections/content.tex).
// Table and figure numbers refer to that paper. Change numbers here only, never in site.js.
window.PLANT_DATA = {
  // Table 1: MIMIC-IV, fine-tuned LLM without / with PLANT.
  backbones: {
    metrics: ["Macro-F1", "Micro-F1", "Macro-AUC", "Micro-AUC", "P@15"],
    avg: [3.0, 2.2, 7.2, 0.8, 3.1], // "Avg. gain with PLANT" row of Table 1
    rows: [
      { name: "Mistral-7B",   size: "7B",                 base: [20.0, 57.0, 90.2, 98.7, 53.8], plant: [23.0, 59.2, 97.4, 99.5, 56.9] },
      { name: "Llama-3.1-8B", size: "8B",                 base: [20.5, 57.5, 90.5, 98.8, 54.0], plant: [23.5, 59.5, 97.6, 99.6, 57.0] },
      { name: "DeepSeek-V3",  size: "671B, 37B active",   base: [19.8, 56.8, 90.0, 98.6, 53.5], plant: [22.8, 59.0, 97.2, 99.4, 56.5] },
      { name: "Phi-3-mini",   size: "3.8B",               base: [19.5, 56.5, 89.8, 98.5, 53.2], plant: [22.5, 58.8, 97.0, 99.3, 56.3] }
    ]
  },
  // Table 2: MIMIC-IV against prior systems.
  sota: {
    cols: ["Model", "Macro-AUC", "Micro-AUC", "Macro-F1", "Micro-F1", "P@8", "P@15"],
    rows: [
      ["CoRelation (Luo et al., 2024)", 97.2, 99.6, 6.3, 57.8, 70.0, 55.3],
      ["PLM-CA (Edin et al., 2024)", 91.8, 99.1, 22.3, 58.9, 70.5, 55.8],
      ["GKI-ICD (Zhang et al., 2025)", 97.1, 99.3, 20.6, 58.5, 70.7, 55.8],
      ["GPT-4 zero-shot (Yuan et al., 2025)", 90.5, 98.8, 5.0, 56.0, 68.0, 53.5]
    ],
    ours: ["PLANT (ours)", 97.4, 99.5, 23.0, 59.2, 72.1, 56.9],
    delta: ["vs. best earlier system", "+0.2 [0.08, 0.31]", "−0.1 [−0.27, 0.06]", "+0.7 [0.48, 0.95]", "+0.3 [0.12, 0.44]", "+1.4 [1.01, 1.88]", "+1.1 [0.72, 1.55]"]
  },
  // Table 3: full EUR-Lex and Wiki10-31K.
  xmtc: {
    cols: ["Model", "EUR-Lex P@1", "P@3", "P@5", "Wiki10 P@1", "P@3", "P@5"],
    rows: [
      ["PECOS (Yu et al., 2022)", 88.41, 75.97, 63.18, 88.69, 80.17, 70.91],
      ["ICXML (Zhu et al., 2023)", 87.10, 74.32, 62.70, 87.61, 79.11, 69.78],
      ["XRR (Xiong et al., 2023)", 87.96, 78.88, 68.52, 89.54, 85.38, 81.34],
      ["X-Transformer + RDE (Shi et al., 2024)", 84.60, 72.61, 61.35, 86.15, 76.99, 68.75],
      ["MatchXML (Ye et al., 2024)", 88.12, 75.00, 62.22, 89.30, 80.45, 70.89],
      ["DE (Gupta et al., 2024)", 87.60, 74.39, 67.80, 88.21, 80.29, 69.91],
      ["InceptionXML + GANDALF (Kharbanda et al., 2023, 2024)", 86.98, 75.89, 68.78, 88.76, 80.32, 69.89],
      ["CG (Chai et al., 2024)", 87.82, 76.71, 68.42, 87.29, 79.81, 68.45],
      ["ELMO (Zhang et al., 2025)", 87.95, 76.48, 65.91, 88.76, 83.94, 77.45],
      ["ViXML (Ortego et al., 2026)", 88.74, 77.12, 66.85, 89.28, 84.67, 78.92]
    ],
    ours: ["PLANT (ours)", 90.61, 81.35, 70.24, 90.91, 87.61, 81.33],
    delta: ["vs. best baseline", "+1.87 [1.14, 2.92]", "+2.47 [1.73, 3.49]", "+1.46 [0.94, 2.11]", "+1.37 [0.76, 1.93]", "+2.23 [1.60, 2.84]", "−0.01 [−0.27, 0.19]"]
  },
  // Table 4 (left), RQ5: same LLM fine-tuned without (FT) and with PLANT.
  w1: {
    cols: ["Backbone", "EUR-Lex P@25", "R@25", "PSP@25", "Wiki10 P@25", "R@25", "PSP@25"],
    groups: [
      { name: "Mistral-7B",   rows: [["FT", 3.2, 31.6, 26.2, 14.6, 57.5, 52.3], ["PLANT", 4.7, 48.5, 42.5, 19.1, 77.2, 67.5]] },
      { name: "Llama-3.1-8B", rows: [["FT", 3.9, 38.1, 31.9, 15.0, 62.5, 46.5], ["PLANT", 5.4, 54.0, 49.5, 19.4, 78.6, 68.6]] },
      { name: "Phi-3-small",  rows: [["FT", 3.1, 29.1, 24.6, 3.9, 12.7, 16.7], ["PLANT", 4.3, 39.0, 39.7, 15.5, 64.7, 49.5]] }
    ]
  },
  // Table 4 (right), RQ6: MIMIC-IV-few precision by training-frequency bucket.
  w2: {
    cols: ["Backbone", "Zero-shot P@1", "Few-shot P@5", "Head P@8", "All P@15"],
    groups: [
      { name: "Mistral-7B",   rows: [["FT", 0.6, 5.5, 27.7, 22.2], ["TF-0", 27.5, 14.9, 29.6, 22.4], ["TF-2", 25.8, 15.5, 29.3, 22.7], ["PLANT", 30.9, 11.6, 30.8, 24.6]] },
      { name: "Llama-3.1-8B", rows: [["FT", 0.8, 0.9, 17.4, 9.9], ["TF-0", 22.8, 13.9, 27.6, 21.0], ["TF-2", 23.4, 13.9, 28.4, 22.3], ["PLANT", 28.4, 13.4, 34.2, 27.0]] },
      { name: "Phi-3-small",  rows: [["FT", 1.1, 6.7, 17.2, 10.8], ["PLANT", 11.2, 5.8, 29.0, 21.4]] }
    ]
  },
  // Figure 2 (right): Rare-F1 (%) on MIMIC-IV, read from the value labels printed on the bars.
  // full = PLANT trained on all data; common = PLANT trained on common labels only; random = random attention init, common labels only.
  rare: {
    rows: [
      { name: "Mistral-7B",   full: 14.0, common: 7.3, random: 0.8 },
      { name: "DeepSeek-V3",  full: 15.5, common: 8.1, random: 1.1 },
      { name: "Llama-3.1-8B", full: 16.8, common: 8.0, random: 0.5 },
      { name: "Phi-3-mini",   full: 13.2, common: 6.9, random: 0.9 }
    ]
  },
  // Figure 3 (right): precision against training size, Mistral-7B on MIMIC-IV. Values computed from the
  // figure's plotted coordinates (the paper prints no numbers); the P@5 values are exact to two decimals.
  trainSize: {
    metrics: ["P@5", "P@15"],
    sizes: [25, 50, 165, 424, 1090, 7203, 18513, 49579],
    base:  [[0.21, 0.24, 0.28, 0.30, 0.43, 0.47, 0.53, 0.60], [0.152, 0.172, 0.176, 0.200, 0.276, 0.275, 0.400, 0.415]],
    plant: [[0.25, 0.31, 0.36, 0.41, 0.50, 0.56, 0.62, 0.68], [0.160, 0.172, 0.200, 0.250, 0.315, 0.359, 0.403, 0.430]]
  },
  // Figure 3 (left): Stage 1 nDCG@k against Macro-F1 after Stage 2, Mistral-7B on MIMIC-IV, with the figure's error bars.
  stage1Quality: {
    pts: [[0.68, 20.6], [0.73, 21.2], [0.77, 21.6], [0.80, 22.0], [0.83, 22.3], [0.86, 22.5], [0.88, 22.7], [0.90, 22.8], [0.92, 23.0], [0.94, 23.0]],
    err: [0.40, 0.38, 0.36, 0.34, 0.32, 0.30, 0.28, 0.26, 0.24, 0.20]
  },
  // Table 5: ablation on MIMIC-IV with Mistral-7B. Each entry: [score, drop, CI low, CI high].
  ablation: {
    metrics: ["Macro-F1", "Macro-AUC", "P@15"],
    full: [23.0, 97.4, 56.9],
    rows: [
      { what: "No Stage 1, BCE loss",              tag: "single-stage training",      s1: true,  v: [[18.0, -5.0, -5.9, -3.8], [91.0, -6.4, -7.2, -5.4], [52.0, -4.9, -5.7, -3.9]] },
      { what: "No Stage 1, focal loss + HNM",      tag: "single-stage training",      s1: true,  v: [[19.5, -3.5, -4.2, -2.7], [92.5, -4.9, -5.8, -4.0], [53.5, -3.4, -4.0, -2.7]] },
      { what: "MSE instead of the ranking loss",   tag: "inside Stage 1",             s1: false, v: [[20.0, -3.0, -3.9, -2.1], [96.0, -1.4, -2.1, -0.8], [53.8, -3.1, -3.9, -2.3]] },
      { what: "Token frequency instead of MIG",    tag: "inside Stage 1",             s1: false, v: [[20.5, -2.5, -3.2, -1.8], [96.5, -0.9, -1.4, -0.5], [54.0, -2.9, -3.6, -2.1]] },
      { what: "Plain BCE in Stage 2",              tag: "no focal, smoothing or HNM", s1: false, v: [[21.0, -2.0, -2.6, -1.4], [95.0, -2.4, -3.0, -1.7], [54.8, -2.1, -2.7, -1.5]] },
      { what: "No hard-negative mining",           tag: "inside Stage 2",             s1: false, v: [[21.0, -2.0, -2.7, -1.3], [96.8, -0.6, -1.0, -0.3], [54.5, -2.4, -3.1, -1.7]] },
      { what: "No label smoothing",                tag: "inside Stage 2",             s1: false, v: [[21.8, -1.2, -1.8, -0.7], [97.0, -0.4, -0.7, -0.2], [55.8, -1.1, -1.7, -0.6]] }
    ]
  }
};
