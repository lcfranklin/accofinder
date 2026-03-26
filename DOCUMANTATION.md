# DIGITIZING THE ACCOMODATION BOOKING PROCCESS

For a long time, the process of booking accomodation places has been a headache due to its physical processes which includes having middlemen (agents) to help clients look for places and clients themselves going physically to look for places. House owners thensleves also find it hard to advertise their properties. This project aims to eradicate these problems by digitizing all these process for safer and trustworthy process.

## Contributions

Team for smooth progress in the project, we are going to use to use the following standards when contributing our work

1.  ### branch naming

        feat/issue#-branch_name
        eg: feat/2-house-booking

2.  ### commit messages

        feat: commit*message #issue*#
        eg: feat: implimented auth #12

3.  ### PR names and descriptions

        Type: Brief Description (Issue #Number)
        eg: Feat: Implement JWT Authentication (#12)

## AccoFinder MVP - Development Workflow

ACCOFINDER MVP - 1 WEEK EXECUTION PLAN

```js
Monday (23/03/2026)
|
|----->Config & Project Foundation
|        |
|        |----->Project Setup (Node/Express, GitHub SSH)
|        |----->Database Setup (PostgreSQL / Prisma)
|        |----->Core Structure (Models, Validators, Utils, AWS, Sockets)
|
|--------|--------------------------->Integration Testing (START - CONTINUES THROUGHOUT)
         |
         Tuesday (24/03/2026)
         |
         |----->User Module
         |        |
         |        |----->User Model + Basic CRUD
         |
         |----->Auth Module (START)
                  |
                  Wednesday (25/03/2026)
                  |
                  |----->Auth Module (COMPLETE)
                  |        |
                  |        |----->JWT, Login, Register
                  |
                  |----->House Listing (START)
                           |
                           Thursday (26/03/2026)
                           |
                           |----->House Listing (COMPLETE)
                           |        |
                           |        |----->Create, View Listings
                           |
                           |----->Notifications (PARALLEL)
                                    |
------------------------------------|--------------------------------------------------
                                    Friday (27/03/2026)
                                    |
                                    |----->House Booking (START)
                                    |
                                    |----->Recommender (OPTIONAL / PARALLEL)
                                             |
                                             Saturday (28/03/2026)
                                             |
                                             |----->House Booking (COMPLETE)
                                             |
                                             |----->Payments (START)
                                                      |
                                                      Sunday (29/03/2026)
                                                      |
                                                      |----->Payments (COMPLETE)
                                                      |
                                                      |----->Disputes (START - OPTIONAL)
                                                               |
                                                               Monday (30/03/2026)
                                                               |
                                                               |----->Disputes (COMPLETE)
                                                               |
                                                               |----->Final Feature Wiring
                                                                        |
                                                                        Tuesday (31/03/2026)
                                                                        |
                                                                        |-----> [CODE COMPLETE ]
                                                                                 |
                                                                                 Wednesday (01/04/2026)
                                                                                 |
                                                                                 |----->Final Testing & Fixes
                                                                                 |
                                                                                 |-----> [MVP RELEASE ]
```
