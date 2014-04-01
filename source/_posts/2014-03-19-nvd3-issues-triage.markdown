---
layout: post
title: nvd3 issues triage
date: 2014-03-19 10:42:43 -0400
author: joesepi
email: sepi@joesepi.com
comments: true
categories:
---

Novus is committed to its open source projects and committed to the community that has grown around these projects. In an effort to tame the recent build-up of issues and pull requests, we would like to outline our appraoch to tackling this accumulation in the short term as well as how we will continue to manage the project's growth in the future.

---
### Short term

Our first priority is to tame the pile of issues and PRs that have recently accumulated. To do so, we will categorize them accordingly:

- **Out of Date**
  For out of date issues and pull requests, we will close the stale request with a brief explanation.
- **Support**
  When an issue falls under the Support banner, we will provide a short answer that we hope is helpful. We may also suggest posting the issue to Stack Overflow to discuss the issue further.
- **Bug in Refactor**
  When the issue is a repeatable bug, we will work with the commenter to fix the matter and hope to resolve the issue without much delay.
- **Feature Enhancement** (Small improvements in existing, refactored code)
  [work with commenter to add improvement in refactored code]
- **New Features** (Large improvements, eg new chart types)
  Our expectation with new features will be to move them to the roadmap and prioritize them accordingly.

With this approach, we expect to be able to address what needs to be done immediately and prioritize everything else.

---
### Long term

In the long term, we would like to take a more holistic approach that can allow us to not only shrink the amount of issues and PRs, but also to potentially expand the group that would help us manicure this garden.

Below is how we will break out the issues, with some overlap from above:

- **Bug**: Request steps to repeat the issue and triage accordingly
- **Improvement**: Request feature tests and implementation and/or triage accordingly
- **Feature**: Triage the request and work with requester to break up the work into small, deliverable pieces and find a shepherd for the feature deliverable

#### Triage levels
- **Duplicate**: closed immediately; with link to other issue
- **Support**: closed immediately; Attempt a short answer/explanation, suggest Stack Overflow for a deeper exploration
- **Fix**: Small task, Shouldn't take more than half a day.
- **Improvement**: Smaller tasks; Easily completable with a couple days' solid work.
- **Feature**: Larger tasks; Takes at least a week, probably needs serious planning before development.

#### Additional tags
- **Intro**: Represents a good entry point to some part of the project
- **Octopages**: Documentation
- **Out of date**: ticket is more than 3 months old and is not automatically mergeable
- **Won't fix**: discretionary; thank you but does not align with project direction or aesthetics

We have added these as labels to Github and have been applying them to the backlog of issues and requests.

As I mentioned, we hope to not only work with the community more in the future but also to bring some trusted developers into the fold to help us evolve nvd3 forward into the future.

Thanks.
