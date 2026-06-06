# Analytics Plan

Interni plan pro GA4 na ZvládnuVýšku.

Measurement ID:

- `NEXT_PUBLIC_GA_MEASUREMENT_ID=G-YSY7QK9T1J`

Consent model:

- Google Analytics se nacita az po souhlasu uzivatele s analytickymi cookies.
- Bez souhlasu se posilaji jen nezbytne cookies pro auth a provoz webu.

## Core Events

Tyto eventy uz jsou v aplikaci napojene a maji nejvyssi prioritu:

- `view_subject_detail`
  - kdyz uzivatel otevre detail predmetu
  - params:
    - `subject_slug`
    - `subject_id`

- `view_public_profile`
  - kdyz uzivatel otevre verejny profil
  - params:
    - `profile_user_id`
    - `is_owner`

- `open_public_profile`
  - klik na verejny profil z user linku
  - params:
    - `source`
    - `has_summary`

- `click_login`
  - klik na login CTA
  - params:
    - `source`
  - aktualni hodnoty source:
    - `navbar_desktop`
    - `navbar_mobile`
    - `hall_of_fame_cta`

- `submit_subject_review`
  - uspesne ulozeni hodnoceni predmetu
  - params:
    - `subject_id`
    - `is_anonymous`
    - `has_comment`
    - `moderation_pending`
    - `overall`

- `submit_teacher_review`
  - uspesne ulozeni hodnoceni vyucujiciho
  - params:
    - `teacher_id`
    - `is_anonymous`
    - `has_review`
    - `moderation_pending`
    - `rating`

- `upload_material`
  - uspesne nahrani materialu
  - params:
    - `subject_id`
    - `is_group_upload`
    - `has_page_count`

- `submit_subject_proposal`
  - uspesne odeslani navrhu predmetu
  - params:
    - `proposal_type`
    - `has_materials`
    - `teacher_count`
    - `is_edit`

- `save_flashcard_deck`
  - uspesne vytvoreni nebo uprava balicku karticek
  - params:
    - `is_edit`
    - `is_public`
    - `question_count`
    - `has_subject`

## Nice To Have Events

Tyhle eventy davaji smysl pridat pozdeji, ale nejsou nutne pro prvni rozumny reporting:

- `search_submit`
  - params:
    - `search_mode`
    - `query_length`
    - `has_results`

- `search_result_click`
  - params:
    - `search_mode`
    - `result_type`
    - `result_rank`

- `open_cookie_settings`
  - params:
    - `source`

- `accept_cookie_analytics`
  - params:
    - `source`

- `reject_cookie_analytics`
  - params:
    - `source`

- `start_flashcard_session`
  - params:
    - `deck_id`
    - `has_subject`
    - `card_count`

- `share_material`
  - params:
    - `subject_id`
    - `material_id`

- `share_deck`
  - params:
    - `deck_id`
    - `has_subject`

- `complete_public_profile_setup`
  - params:
    - `has_secondary_faculty`

- `open_onboarding_modal`
  - params:
    - `source`
    - `missing_identity`
    - `missing_legal_acceptance`

## Recommended GA4 Custom Dimensions

V GA4 je potreba nektere custom parametry zaregistrovat rucne, jinak se v reportech hure pouzivaji.

Doporucene event-scoped custom dimensions:

- `source`
- `subject_id`
- `subject_slug`
- `teacher_id`
- `profile_user_id`
- `proposal_type`
- `is_anonymous`
- `moderation_pending`
- `is_group_upload`
- `is_edit`
- `is_public`
- `has_subject`
- `has_materials`
- `has_comment`
- `has_review`
- `question_count`
- `teacher_count`
- `has_summary`
- `is_owner`

## Recommended Custom Metrics

Pokud budes chtit lepsi agregace v GA4 explorations, dava smysl zaregistrovat i nektere numericke parametry jako custom metrics:

- `overall`
- `rating`
- `question_count`
- `teacher_count`

## First Useful Reports

Prvni reporty, ktere dava smysl sledovat:

1. Ktere predmety maji nejvic otevrenych detailu
2. Kolik prihlasovacich CTA kliku prichazi z navbaru vs. Hall of Fame
3. Kolik uzivatelu odesle recenzi predmetu a vyucujiciho
4. Kolik uzivatelu nahraje material
5. Kolik uzivatelu vytvori verejny balik karticek
6. Kolik navrhu predmetu konci odeslanim

## Suggested Funnel Checks

1. `view_subject_detail` -> `submit_subject_review`
2. `view_subject_detail` -> `upload_material`
3. `view_subject_detail` -> `save_flashcard_deck`
4. `click_login` -> onboarding -> contribution event
5. `view_public_profile` -> `open_public_profile` from other surfaces

## Naming Rules

Drzet stale stejnou taxonomii:

- eventy pojmenovavat `verb_object`
- zdroje drzet v parametru `source`
- bool parametry pojmenovavat `is_*` nebo `has_*`
- entity ID drzet jako `*_id`
- slugy drzet jako `*_slug`

## Where To Maintain It

- centralni event names: [frontend/lib/analytics.ts](frontend/lib/analytics.ts)
- mount tracking helper: [frontend/components/analytics/track-event-on-mount.tsx](frontend/components/analytics/track-event-on-mount.tsx)
- GA bootstrap + consent handling: [frontend/components/layout/google-analytics.tsx](frontend/components/layout/google-analytics.tsx)
- cookie consent banner: [frontend/components/layout/cookie-consent-banner.tsx](frontend/components/layout/cookie-consent-banner.tsx)
