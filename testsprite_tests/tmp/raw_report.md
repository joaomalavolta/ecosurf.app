
# TestSprite AI Testing Report(MCP)

---

## 1️⃣ Document Metadata
- **Project Name:** ecosurf.app
- **Date:** 2026-06-26
- **Prepared by:** TestSprite AI Team

---

## 2️⃣ Requirement Validation Summary

#### Test TC001 Register and complete access-code login
- **Test Code:** [TC001_Register_and_complete_access_code_login.py](./TC001_Register_and_complete_access_code_login.py)
- **Test Error:** TEST FAILURE

The backdoor login did not authenticate — submitting the exact backdoor string and accepting terms produced an error and the authenticated Radar/dashboard was not reached.

Observations:
- The landing page shows the E-mail field filled with 'joamalavolta@gmail.com:jr08197912345' and the terms checkbox is checked.
- After clicking 'Enviar código de acesso' multiple times, the page displays the message 'Invalid login credentials'.
- The Radar/dashboard did not appear and the user is not signed in (no authenticated UI visible).
- **Test Visualization and Result:** https://www.testsprite.com/dashboard/mcp/tests/28f030d2-a16b-46b9-8a58-fb18712668e1/0bee2a49-6797-4f94-b8de-0d001da50ac9
- **Status:** ❌ Failed
- **Analysis / Findings:** {{TODO:AI_ANALYSIS}}.
---

#### Test TC002 Publish a surf report with a photo and nearest spot
- **Test Code:** [TC002_Publish_a_surf_report_with_a_photo_and_nearest_spot.py](./TC002_Publish_a_surf_report_with_a_photo_and_nearest_spot.py)
- **Test Visualization and Result:** https://www.testsprite.com/dashboard/mcp/tests/28f030d2-a16b-46b9-8a58-fb18712668e1/c21c8399-907f-4c4d-b275-ceb655b05bf2
- **Status:** ✅ Passed
- **Analysis / Findings:** {{TODO:AI_ANALYSIS}}.
---

#### Test TC003 Start contributing from the public app as a new user
- **Test Code:** [TC003_Start_contributing_from_the_public_app_as_a_new_user.py](./TC003_Start_contributing_from_the_public_app_as_a_new_user.py)
- **Test Visualization and Result:** https://www.testsprite.com/dashboard/mcp/tests/28f030d2-a16b-46b9-8a58-fb18712668e1/7777cc8d-69dd-44f4-8585-bcc02bf61465
- **Status:** ✅ Passed
- **Analysis / Findings:** {{TODO:AI_ANALYSIS}}.
---

#### Test TC004 Publish an environmental alert with category, severity, and description
- **Test Code:** [TC004_Publish_an_environmental_alert_with_category_severity_and_description.py](./TC004_Publish_an_environmental_alert_with_category_severity_and_description.py)
- **Test Error:** TEST BLOCKED

The test could not be run — authentication could not be completed using the provided backdoor credentials, and creating an environmental alert requires a logged-in user.

Observations:
- After entering the backdoor credential string into the email field and submitting, the page displayed 'Invalid login credentials'.
- The profile/login form remains visible and the app blocks alert creation until authenticated.

- **Test Visualization and Result:** https://www.testsprite.com/dashboard/mcp/tests/28f030d2-a16b-46b9-8a58-fb18712668e1/f6c40b1b-13be-42f5-a28c-fa11929075e7
- **Status:** BLOCKED
- **Analysis / Findings:** {{TODO:AI_ANALYSIS}}.
---

#### Test TC005 Explore public Radar content without signing in
- **Test Code:** [TC005_Explore_public_Radar_content_without_signing_in.py](./TC005_Explore_public_Radar_content_without_signing_in.py)
- **Test Visualization and Result:** https://www.testsprite.com/dashboard/mcp/tests/28f030d2-a16b-46b9-8a58-fb18712668e1/3b2acce1-2885-4ac2-abcc-3e42f3d98f6d
- **Status:** ✅ Passed
- **Analysis / Findings:** {{TODO:AI_ANALYSIS}}.
---

#### Test TC006 Complete profile setup after first login
- **Test Code:** [TC006_Complete_profile_setup_after_first_login.py](./TC006_Complete_profile_setup_after_first_login.py)
- **Test Error:** TEST FAILURE

The backdoor login did not work — the application did not log in after entering the backdoor string and requesting access code.

Observations:
- The page shows the message 'Invalid login credentials' after clicking 'Enviar código de acesso'.
- The email input contains the exact backdoor string 'joaomalavolta@gmail.com:jr08197912345' and the terms checkbox is checked.
- No transition to the OTP screen or onboarding/profile setup occurred despite multiple attempts.
- **Test Visualization and Result:** https://www.testsprite.com/dashboard/mcp/tests/28f030d2-a16b-46b9-8a58-fb18712668e1/524ee2fc-01d8-42a9-96ba-7c144a07df13
- **Status:** ❌ Failed
- **Analysis / Findings:** {{TODO:AI_ANALYSIS}}.
---

#### Test TC007 Explore public Map content without signing in
- **Test Code:** [TC007_Explore_public_Map_content_without_signing_in.py](./TC007_Explore_public_Map_content_without_signing_in.py)
- **Test Visualization and Result:** https://www.testsprite.com/dashboard/mcp/tests/28f030d2-a16b-46b9-8a58-fb18712668e1/6f09ff56-018e-4609-bb15-9a51c2d88f7b
- **Status:** ✅ Passed
- **Analysis / Findings:** {{TODO:AI_ANALYSIS}}.
---

#### Test TC008 Open a public spot from the radar and inspect its timeline
- **Test Code:** [TC008_Open_a_public_spot_from_the_radar_and_inspect_its_timeline.py](./TC008_Open_a_public_spot_from_the_radar_and_inspect_its_timeline.py)
- **Test Error:** TEST FAILURE

The spot detail page did not present the expected 'Condições' (current conditions) or 'Linha do tempo' (daily timeline) sections for review.

Observations:
- The event detail page for 'Ação Ecosurf' is visible and shows date, location, organizer, map, description, volunteer info, and participants.
- No visible sections or labels named 'Condições' or 'Linha do tempo' were found after full-page scrolls and searches.
- The UI provides event metadata but lacks the current conditions and daily timeline features requested by the test.
- **Test Visualization and Result:** https://www.testsprite.com/dashboard/mcp/tests/28f030d2-a16b-46b9-8a58-fb18712668e1/61a3c0e3-7d9f-4181-8402-ef3de6d5e0e9
- **Status:** ❌ Failed
- **Analysis / Findings:** {{TODO:AI_ANALYSIS}}.
---

#### Test TC009 See sensitive details hidden on a restricted spot
- **Test Code:** [TC009_See_sensitive_details_hidden_on_a_restricted_spot.py](./TC009_See_sensitive_details_hidden_on_a_restricted_spot.py)
- **Test Error:** TEST FAILURE

Sensitive participant information is exposed on a community/muted spot page — participant names are visible.

Observations:
- The spot page for 'Ação Ecosurf' shows a 'Participantes' section with the name 'João'.
- The spot page remained accessible and interactive while these details were visible.

- **Test Visualization and Result:** https://www.testsprite.com/dashboard/mcp/tests/28f030d2-a16b-46b9-8a58-fb18712668e1/b6cd9796-1b4c-45f2-aa43-a6e5fccd5fd2
- **Status:** ❌ Failed
- **Analysis / Findings:** {{TODO:AI_ANALYSIS}}.
---

#### Test TC010 Open a spot from the Radar feed
- **Test Code:** [TC010_Open_a_spot_from_the_Radar_feed.py](./TC010_Open_a_spot_from_the_Radar_feed.py)
- **Test Visualization and Result:** https://www.testsprite.com/dashboard/mcp/tests/28f030d2-a16b-46b9-8a58-fb18712668e1/8c35cb4f-4f43-4fc2-aceb-5b9cc61a351e
- **Status:** ✅ Passed
- **Analysis / Findings:** {{TODO:AI_ANALYSIS}}.
---

#### Test TC011 Open a spot from the Radar map
- **Test Code:** [TC011_Open_a_spot_from_the_Radar_map.py](./TC011_Open_a_spot_from_the_Radar_map.py)
- **Test Visualization and Result:** https://www.testsprite.com/dashboard/mcp/tests/28f030d2-a16b-46b9-8a58-fb18712668e1/ca392a97-9b9f-4a6c-b569-fdaecb8b1f6b
- **Status:** ✅ Passed
- **Analysis / Findings:** {{TODO:AI_ANALYSIS}}.
---

#### Test TC012 Create and publish a mutirão
- **Test Code:** [TC012_Create_and_publish_a_mutiro.py](./TC012_Create_and_publish_a_mutiro.py)
- **Test Error:** TEST BLOCKED

The test could not be run — the login backdoor did not grant access so the Actions flow could not be reached.

Observations:
- After submitting the backdoor credential the page displays 'Invalid login credentials'.
- The login form still shows the backdoor string 'joamalavolta@gmail.com:jr08197912345' in the email input and the terms checkbox is checked; no successful login occurred.
- **Test Visualization and Result:** https://www.testsprite.com/dashboard/mcp/tests/28f030d2-a16b-46b9-8a58-fb18712668e1/481be8d7-9899-4c08-9ef0-02546130bbca
- **Status:** BLOCKED
- **Analysis / Findings:** {{TODO:AI_ANALYSIS}}.
---

#### Test TC013 Browse the Radar dashboard filters
- **Test Code:** [TC013_Browse_the_Radar_dashboard_filters.py](./TC013_Browse_the_Radar_dashboard_filters.py)
- **Test Error:** TEST FAILURE

The login backdoor did not work and the Radar dashboard could not be reached, so the feed filter functionality could not be verified.

Observations:
- The login page shows 'Invalid login credentials' after submitting the backdoor string.
- The email input contains 'joamalavolta@gmail.com:jr08197912345' and the terms checkbox is checked, but no navigation to the dashboard or OTP flow occurred.
- The Radar view and feed filter controls were not accessible because the session did not authenticate.
- **Test Visualization and Result:** https://www.testsprite.com/dashboard/mcp/tests/28f030d2-a16b-46b9-8a58-fb18712668e1/52691fc1-7891-461f-970b-010f81581196
- **Status:** ❌ Failed
- **Analysis / Findings:** {{TODO:AI_ANALYSIS}}.
---

#### Test TC014 Browse a spot timeline over the tide curve
- **Test Code:** [TC014_Browse_a_spot_timeline_over_the_tide_curve.py](./TC014_Browse_a_spot_timeline_over_the_tide_curve.py)
- **Test Error:** TEST FAILURE

The timeline slider and tide curve UI required for inspection are not present on the spot detail page, so the test steps that move the timeline and verify tide visibility cannot be performed.

Observations:
- The spot detail page successfully opened and displays event details (date/time, location, organizer), a map canvas, and participant/CTA cards, but no timeline or tide-curve UI is visible.
- Multiple searches for 'maré', 'linha do tempo', and 'timeline' and DOM inspections returned no matching elements; scrolling the page did not reveal any slider or tide curve.
- Actions performed: navigated to public radar, opened the 'Ação Ecosurf' spot detail, scrolled the page twice, and ran repeated keyword/DOM searches — none located the required timeline/tide UI.
- **Test Visualization and Result:** https://www.testsprite.com/dashboard/mcp/tests/28f030d2-a16b-46b9-8a58-fb18712668e1/69306409-4ae0-44dd-a1e4-f802366cf172
- **Status:** ❌ Failed
- **Analysis / Findings:** {{TODO:AI_ANALYSIS}}.
---

#### Test TC015 Browse map layers and open a related item
- **Test Code:** [TC015_Browse_map_layers_and_open_a_related_item.py](./TC015_Browse_map_layers_and_open_a_related_item.py)
- **Test Error:** TEST FAILURE

Clicking an individual marker did not open a marker panel and the related page could not be opened.

Observations:
- The map shows Mutirões markers (orange people icon) but clicking the map/canvas did not open a marker panel.
- Multiple attempts were made: toggling the Mutirões layer off/on, zooming in, and clicking the map canvas several times; no panel appeared.
- Other map controls responded (layer buttons and zoom), so the issue appears specific to marker selection and opening the marker panel.
- **Test Visualization and Result:** https://www.testsprite.com/dashboard/mcp/tests/28f030d2-a16b-46b9-8a58-fb18712668e1/27e2eece-ad1d-48b9-a1c8-1aca3e4fe067
- **Status:** ❌ Failed
- **Analysis / Findings:** {{TODO:AI_ANALYSIS}}.
---


## 3️⃣ Coverage & Matching Metrics

- **40.00** of tests passed

| Requirement        | Total Tests | ✅ Passed | ❌ Failed  |
|--------------------|-------------|-----------|------------|
| ...                | ...         | ...       | ...        |
---


## 4️⃣ Key Gaps / Risks
{AI_GNERATED_KET_GAPS_AND_RISKS}
---