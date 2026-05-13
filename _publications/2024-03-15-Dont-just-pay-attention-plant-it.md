---
title: "Dont Just Pay Attention, PLANT It"
collection: publications
permalink: /publication/2024-03-15-Dont-just-pay-attention-plant-it
excerpt: '
TL;DR: In Extreme Multi-Label Text Classification (XMTC), we train a standalone attention model outside the pipeline, integrate it, and fine-tune, enabling faster learning with less data. Specifically, we transfer transfer L2R models to fine-tune attention in XMTC for ICD coding
'
date: 2024-03-15
venue: 'Preprint'
paperurl: 'https://arxiv.org/pdf/2410.23066'
citation: 'Your Name, You. (2024). &quot;Paper Title Number 1.&quot; <i>Journal 1</i>. 1(1).'
---
Abstract: The keystone of state-of-the-art Extreme Multi-Label Text Classification (XMTC) models is the multi-label attention layer within the decoder, which deftly directs label-specific focus to salient tokens in input text. Nonetheless, the process of acquiring these optimal attention weights is onerous and resource-intensive. To alleviate this strain, we introduce **PLANT** --- **P**retrained and **L**everaged **A**tte**NT**ion --- an innovative transfer learning strategy to fine-tune XMTC decoders. The central notion involves transferring a pretrained learning-to-rank (L2R) model, utilizing its activations as attention weights, thereby serving as the *'planted'* attention layer in the decoder. 
On the full MIMIC-III dataset, **Plant** excels in four out of seven metrics and surpasses in five for the top-50 code set, demonstrating its effectiveness. Remarkably, for the rare-50 code set, **Plant** achieves a significant 12.7-52.2% improvement in four metrics. On MIMIC-IV, it leads in three metrics. 
Notably, in low-shot scenarios, **Plant** matches traditional attention models' precision despite using significantly less data (1/10 for precision at 5, 1/5 for precision at 15), highlighting its efficiency with skewed label distributions.


[Download paper here](https://arxiv.org/pdf/2410.23066)

[Code](https://github.com/debjyotiSRoy/xcube/tree/plant)

Recommended citation: Your Name, You. (2024). "Paper Title Number 1." <i>Journal 1</i>. 1(1).
