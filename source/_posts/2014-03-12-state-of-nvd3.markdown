---
layout: post
title: The Future of NVD3 - March, 2014
date: 2014-03-12 17:44:38 -0400
comments: true
categories:
---

When I joined Novus last November, I'd spent some time playing with three.js visualizations, but hadn't really looked at that d3 thing. Of course, as a financial technology firm, 2d charts and graph visualizations are all we do. So I learned d3, and this little nvd3 home-grown thing. I knew there was a community out there - at least, I'd come across random tweets mentioning it, but I really hadn't dug in. Then I had to make some changes. Before you know it, I'm waist deep in refactoring what for all intents and purposes was an internal prototyped tech demo that's become a great project on Github! Yet we've been, to the community's detriment, busy at Novus.

Yes, we knew the PR and issue counts were rising, but we're heads down on some internal projects, and no one really pushed or prodded us about nvd3. My colleagues robinfhu, twolfnovus, and fshao816 were fixing bugs, adding some features we needed, and generally making it look like NVD3 was still making progress. Turns out, just because no one in the community is yelling, doesn't mean there aren't problems! After getting a foreceful tweet from John Schulz (@JFSIII), I asked around my colleagues and realized we had, in fact, been getting quite a few quiet pokes and prods. The growing issue count is obviously frustrating to people trying to use the library, but the growing PR count shows people are still very much trying to create a successful, sustainable project in spite of Novus' lack of recent feedback - we clearly cannot leave our heads in the sand and just hope that what we need happens to be what you need.

The good news - we're reprioritizing, moving NVD3 way up in our list of UI focus at Novus. The bad news - NVD3 is still at number two, behind a massive internal rewrite we've been doing since Decemeber of 2013, due to complete in the next couple months. The ugly news - NVD3 needs a major refactor. As I mentioned, it really is a large tech demo, with large swaths of copy-paste code, duplicated logic, and complete lack of overall architecture. The testing is piecemeal, spotty, and manual. The build, though is super fast. Basically, we want to refactor this into something that makes a lot more sense, and follows much better coding principles (seperate some concerns, DRY out the wet parts, wrap it in a test harness). We have started this work, and are using it internally - you can track it in [this pull request][1].

Beyond this code work, we need to expand the way we accept community feedback. We would like to find trusted collaborators to empower with access to the novus/nvd3 repository. If you are interested, please email me - dsouther (at )novus( dot)com.

Over the next few weeks, we'll have a better understanding of the balance between internal projects and NVD3 itself. In short, look for three things in the coming couple months.

- Refactor NVD3 to a maintainable codebase.
- Clear the Issues and PR Backlog.
- Add nvGrid, a powerful grid / table component.

This is where we're at today, and we have some good improvements that we want to put in place between now and June. Keep your dial tuned!

*Yours,*

**David Souther**

*Software Architect - Novus Partners*


[1]: https://github.com/novus/nvd3/pull/442
