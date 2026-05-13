---
title: "Approximation Algorithms for Budget Constrained Network Upgradeable Problems"
collection: publications
permalink: /publication/2014-12-11-Approximation-algorithms-for-budget-constrained-network-upgradeable-problems
excerpt: 'TL;DR: We explore budget-constrained network upgradeable problems on undirected graphs, presenting algorithms for:
1. Finding a maximum weight constrained spanning tree within a budget, improving upon prior results.
2. Solving the longest path problem in a directed acyclic graph (DAG) with limited improvements, achieving efficient algorithms and approximations.'
date: 2014-12-11
venue: 'arXiv'
paperurl: 'https://arxiv.org/abs/1412.3721'
citation: 'Saharoy, Debjyoti, and Sandeep Sen. "Approximation algorithms for budget constrained network upgradeable problems." arXiv preprint arXiv:1412.3721 (2014).'
---

# Abstract
We study budget constrained network upgradeable problems. We are given an undirected edge weighted graph $G=(V, E)$ where the weight an edge $e \in E$ can be upgraded for a cost $c(e)$. Given a budget $B$ for improvement, the goal is to find a subset of edges to be upgraded so that the resulting network is optimum for $B$. The results obtained in this paper include the following.
1. **Maximum Weight Constrained Spanning Tree**: We present a randomized algorithm for the problem of weight upgradeable budget constrained maximum spanning tree on a general graph. This returns a spanning tree $\mathcal{T}^{\prime}$ which is feasible within the budget $B$, such that $\operatorname{Pr}\left[l\left(\mathcal{T}^{\prime}\right) \geq(1-\epsilon) \mathrm{OPT}, c\left(\mathcal{T}^{\prime}\right) \leq B\right] \geq 1-\frac{1}{n}$ (where $l$ and $c$ denote the length and cost of the tree respectively), for any fixed $\epsilon>0$, in time polynomial in $V=n,E=m$. 
Our results extend to the minimization version also. Previously Krumke et. al. $\left[\mathrm{KNM}^{+} 97\right]$ presented a $\left(1+\frac{1}{\gamma}, 1+\gamma\right)$ bicriteria approximation algorithm for any fixed $\gamma>0$ for this problem in general graphs for a more general cost upgrade function. The result in this paper improves their 0/1 cost upgrade model.
2. **Longest Path in a $D A G$**: We consider the problem of weight improvable longest path in a $n$ vertex DAG and give a $O\left(n^3\right)$ algorithm for the problem when there is a bound on the number of improvements allowed. We also give a $(1-\epsilon)$-approximation which runs in $O\left(\frac{n^4}{\epsilon}\right)$ time for the budget constrained version. Similar results can be achieved also for the problem of shortest paths in a DAG.

[Download paper here](https://arxiv.org/pdf/1412.3721.pdf)

Recommended citation: Saharoy, Debjyoti, and Sandeep Sen. "Approximation algorithms for budget constrained network upgradeable problems." arXiv preprint arXiv:1412.3721 (2014).
