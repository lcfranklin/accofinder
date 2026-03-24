## DIGITIZING THE ACCOMODATION BOOKING PROCCESS

For a long time, the process of booking accomodation places has been a headache due to its physical processes which includes having middlemen (agents) to help clients look for places and clients themselves going physically to look for places. House owners thensleves also find it hard to advertise their properties. This project aims to eradicate these problems by digitizing all these process for safer and trustworthy process.

WORK FLOW FOR THE BACKEND DEVELOPMENT
DURATION: 1 WEEK

gantt
title AccoFinder MVP - 1 Week Development
dateFormat YYYY-MM-DD
axisFormat %a %d

    section Config
    Models, Database, Validators, AWS :active, config, 2026-03-23, 2d

    section Features
    User Profile           :user, 2026-03-24, 2026-03-25
    Authentication         :auth, 2026-03-25, 2026-03-27
    House Listing          :listing, 2026-03-27, 2026-03-29
    Notifications          :notif, 2026-03-27, 2026-03-29
    House Booking          :booking, 2026-03-29, 2026-03-30
    Recommender            :rec, 2026-03-29, 2026-03-30
    Payments               :crit, payments, 2026-03-30, 2026-03-31
    Disputes               :crit, disputes, 2026-03-31, 2026-04-02

    section Milestones
    Code Complete          :milestone, m1, 2026-03-31, 0d
    MVP Release            :milestone, m2, 2026-04-01, 0d

    section Testing
    Integration Testing    :test, 2026-03-24, 2026-04-03
