# ІЗ paper design — final design QA

final result: passed

## Scope and evidence
Source visual truth: selected-reference.png (1536×1024 design board; user-provided design reference).
Rendered implementation: http://localhost:4173/ and http://127.0.0.1:4173/.
State: signed-out landing, cream theme, closed mobile menu. The newly requested sign-in control is an intentional addition to the selected reference.

Desktop evidence: work/iz-design/qa/home-desktop-full.png (1280×2122 raster); compared region is 1280×977 CSS px at 1× density.
Source desktop crop: x27,y36 to x1161,y902 (1134×866), scaled uniformly by 1280/1134. Board padding and “Ноутбук” label excluded.
Mobile evidence: work/iz-design/qa/home-mobile-full.png (432×3303 raster); compared region is 432×1219 CSS px at 1× density.
Source phone crop: x1201,y36 to x1510,y908 (309×872), scaled uniformly by 432/309. Board padding and “Телефон” label excluded.
Full-view combined inputs, opened and inspected after normalization:
- work/iz-design/qa/desktop-comparison-final.jpg
- work/iz-design/qa/mobile-comparison-final.jpg
Focused typography input, opened and inspected:
- work/iz-design/qa/heading-comparison-final.jpg
These are combined source/implementation inputs, not separate images presented as a side-by-side review. Earlier clipped screenshots and screenshots with a mismatched density were excluded from final evidence.

## Comparison history
1. First desktop comparison found P2 supporting copy/CTA too small, overly tight heading spacing/thin underline, and compressed signal-strip rhythm. Evidence: desktop-comparison-first.jpg and heading-comparison-first.jpg. Result stayed blocked.
2. Increased supporting text, CTA dimensions/type, word spacing, raster underline height and signal-strip spacing. Mobile comparison then found P2 title/logo too small and supporting copy wrapping into two lines instead of three. Increased phone display/logo size, constrained supporting copy, enlarged mobile CTA. Evidence: final combined desktop/mobile captures above.
3. Functional-screen inspection found P2 legacy rounded white result/history surfaces. Replaced them with the paper palette, thin rules, small corner radii and darker editorial text. Fixed the mobile “Подход” link so it closes the menu and focuses the destination. Post-fix result evidence: result-mobile-full.png. Browser interactions below passed.
4. Latest combined comparison found no actionable P0/P1/P2 differences. No visual changes made after this passing comparison.

## Required fidelity surfaces
- Fonts/typography: self-hosted Inter display and Manrope body. Heavy two-line headline, underlined second line, clear body/CTA hierarchy. Text is readable and does not collide with artwork or controls. Exact source font metadata is unavailable; slight optical differences are acceptable P3.
- Spacing/layout: split desktop hero with diagonal art edge; mobile stack keeps title, CTA, privacy note, full-width art and signal list in order. Intentional sign-in button fits both headers. Generated art proportions vary slightly but preserve the source hierarchy.
- Colors/tokens: ivory paper, black type/CTA, raspberry art/underline, lime privacy marker. Semantic result colors retained for meaning; legacy blue controls replaced. No generic new gradients or decorative CSS art.
- Image quality/assets: generated realistic folded-ticket hero, document image and transparent brush asset are sharp and locally served; standard licensed menu/asterisk/Google icons used. Image content, Russian label, crop and mask inspected. Residual paper-fold and brush hue/shape differences are acceptable P3 generated-asset variation. Existing brand wordmark preserved.
- Copy/content: landing copy matches the selected meaning; no misleading promises. Results show real engine output and source quotes. Google UI clearly explains local storage and no cross-device transfer; no phone or site password field.

## Functional and accessibility checks
Browser-rendered checks: landing→check form; empty-submit message; text analysis; sample opening; saved history/search; draft restoration after navigation; mobile menu/Escape; approach anchor focus; screenshot upload and real OCR analysis. The synthetic bicycle screenshot correctly produced prize/payment/random-selection/commission quotes. Existing saved records were preserved.
Keyboard and modal labels/focus, visible focus style, reduced-motion behavior and mobile touch targets reviewed. Existing focus script passed 23/23; its contrast checks are regression checks, not a full independent audit of the new design.
Engine/release 38/38; input-draft 29/29; Google token verifier 14/14. Valid signed fixtures accepted; invalid issuer/audience/nonce/expiry/signature/email rejected. No production mock identity.

## Google activation evidence and limits
Real OAuth web client created in project iz-safenet and public ID saved to dist/auth-config.mjs. Exact localhost, loopback preview and public-site JavaScript origins confirmed saved in Google Cloud. No client secret stored in static files or reports.
Real sign-in completed in ordinary Chrome on http://localhost:4173/, verified account shown, sign-out returned “Войти”, refresh after sign-out remained signed out. Chrome console error/warning list for the successful flow was empty. Proof: outputs/google-sign-in-confirmed.png (cropped from actual browser capture, surrounding header retained).
Google Cloud remains in Testing with the owner account listed as a test user. Production activation and website publication are not completed. Embedded Codex browser produced Google provider/FedCM errors; real sign-in is verified in Chrome, not claimed to work in every embedded browser.
The display identity is memory-only for this tab; refresh requires sign-in again. Local checks do not sync and are not isolated per Google account. There is no server session or cloud account database.

## Final checklist
- [x] Earlier P2 visual findings fixed and compared again.
- [x] Desktop and mobile combined source/render evidence inspected.
- [x] Core text, OCR, example, history and draft flow exercised.
- [x] Public Google Client ID connected and actual Chrome sign-in verified.
- [x] External OAuth/publication limitations documented accurately.
- [x] Temporary viewport overrides reset before handoff.

final result: passed

## Mobile feedback follow-up — 22 October 2026

User evidence: WhatsApp Image 2026-10-22 at 18.41.38.jpeg (form hierarchy) and 18.40.57.jpeg (scattered footer).
- [P2, fixed] Label/instructions/example had insufficient hierarchy. Field label is now “Текст условий”, 20px/750; persistent instructions are 13px; a shorter placeholder is 14px; entered text remains 16px. Instructions are associated with the input via aria-describedby.
- [P2, fixed] Wrapped footer flex items inherited auto margins and spread across rows. At mobile widths the five links are a single aligned grid/list, with equal 46px tap rows. Legal links form a separate aligned list. Footer CTA typography explicitly overrides the legacy small button rule.
Evidence: work/mobile-fixes/check-390-full.png and result-390-full.png; focused combined after image: outputs/mobile-fixes.png. Readable screenshots inspected. 390px viewport confirmed by DOM measurements; all links x=30,width=330,height=46. No overflow at 320, 390 or 1280 CSS px. At 1280 the desktop footer keeps its horizontal layout.
Manual checks: footer about/history links; return to new check; sample fill; successful analysis and source quotes on result. No console errors/warnings. Node syntax and 29/29 draft regression checks passed. Browser tests used isolated localhost:4183 storage; existing user drafts were preserved. Temporary viewport overrides reset.

final result: passed


## TEMIR footer logo follow-up — 22 October 2026

Adapted the user-provided italic TEMIR badge into a transparent near-black wordmark/frame with a raspberry dot matching the paper design. Replaced the lower team-credit text with only the logo in the app and both legal footers. The logo is an accessible ordinary anchor to the exact user-provided Instagram URL; opens a new tab with noopener/noreferrer. No duplicate site-name text remains in that credit.

Visual evidence: work/temir-logo/mobile-final-full.png and desktop-final-full.png; focused mobile proof: outputs/temir-footer-mobile.png. Rendered 132×44 image loaded correctly, has real transparency and no avatar circle; the mark remains legible on ivory. Mobile 320px/390px and desktop 1280px had no horizontal overflow. Legal footer images loaded correctly. The mobile navigation list from the previous fix is preserved.

Checks: Node module syntax passed. Browser DOM confirmed an image-only credit, accessible link name, exact Instagram href, target and rel attributes. Click exercised; the embedded browser did not expose a new Instagram tab, so no claim is made about Instagram account content or login. Logo, rendering and source anchor behavior are verified. No console errors or warnings during legal-page verification. No app engine/auth/data changes. Temporary viewport override reset.

final result: passed

## Jury follow-up · v1.9 · 22 October 2026

Scoped improvements based on the jury audit: analyst discoverability, mobile/desktop readability, honest evaluation evidence, and a concrete human-pilot procedure. Existing paper/raspberry identity, TEMIR Instagram credit and Google configuration retained.

- [P2, fixed] Analyst entry was buried in the footer. It is now in both main menus, with a three-step guide and a direct quality link.
- [P2, fixed] Analyst heading previously touched the viewport edge. The workspace wrapper now gives x=68 at 1280px and x=24 at 390px. Readable labels, 44px filters, mobile two-column actions/filters, compact three-column stats and semantic badges were inspected in actual screenshots.
- [P2, fixed] Source/status text still inherited pale legacy colors. Computed final source/new status is #625a50, review status #6d4b16; 13px text. New badge pairs use dark red/amber/green text on light backgrounds.
- [P2, fixed] Changing an in-page hash externally did not render a new route. Actual hash navigation now changes the screen; an exact typed draft survives #check→#campaigns→#check. Internal anchors outside known routes remain anchors.
- [P2, fixed] Quality evidence mixed historical results with development. The new first v1.9/v7 result is first, with all errors, languages, intervals and downloads. Open development and previous failed results are explicitly separate. Current JSON export includes all three kinds of evidence.
- [P2, improved] Current pitch script and short counterbalanced human-pilot procedure are available; CSV has headers only. Previous v1.8 slides are labelled and grouped as archived material. No live rehearsal or human trial is claimed.
- [P1, remains] Recognition of unseen wording is insufficient. First v1.9/v7 run: 56/100 exact levels, TP13 FP1 FN27 TN59; recall high 32.5%, mixed 1/8 and translit 0/8. All 44 mismatches remain. Rules were not tuned after this result. AI-synthetic labels and designed prevalence do not establish real-world accuracy. A specialist-labelled real corpus and a new test remain necessary.

Validation: 38/38 release, 55/55 engine context, 82/82 compatibility, 64/64 structured review, 29/29 draft, 26/26 source sensitivity and 47/47 network checks passed. These are separate software checks, not detector accuracy. The original v1.8/v6 first result reproduces in an isolated snapshot; current v1.9/v7 reproduces with matching frozen input hashes and zero quote/offset errors. A same-data development comparison is reported only as development (v5 156→158/200; v6 35→80/80 after opening it).

Actual browser: mobile menu, queue filters/search, paid/free analyses, original quotes, form draft restoration, hash navigation, expanded language/errors/history, current submission page and pilot guide were exercised on isolated localhost:4185. No global overflow at queue widths 320/390/768/1024/1280 or quality 320/390/1024/1280. No console errors/warnings observed. Static HTML links/module imports: 173 resolved. Evidence: work/jury-improvements/analyst-final-mobile.png, analyst-final-desktop.png, quality-final-mobile.png, quality-final-desktop.png, submission-final-mobile.png and pilot-guide-mobile.png. Final combined proof: outputs/site-improvements.png in the task workspace.

Result: scoped UI and reproducibility checks passed. Detector reliability and human usefulness remain unproven; no new jury score is asserted.


## v2.0 · обновление после оценки жюри · 22.10.2026

- Карточка аналитика: бумажные цвета, чёткая иерархия, отступы, управление от 44–48px и поля 16px; обзор приоритета появляется до источников на мобильном экране. Служебная шкала перенесена под пояснение; она не является вероятностью.
- Ширины 320,390,768,1024,1280px: у подробного дела нет горизонтального переполнения. Desktop312px aside ограничен высотой окна и имеет прокрутку; на телефоне обычный поток. Скриншоты в work/toward-90/qa задачи, обзор в outputs/iz-v20-improvements.jpg.
- В браузере пройдены три точных подтверждения из двух демоисточников → отдельный ручной высокий приоритет → сохранённое решение с цитатами и позициями. Это программная проверка на синтетике, не работа настоящего аналитика.
- SVG карты статичен; все материалы доступны HTML-кнопками с понятными именами. Участок текста эфира подписан корректно.
- Lazy report: начальный статический граф 29 модулей/441805 сырых байт против 35/1455041. Это не замер времени или сжатого трафика. Ошибка загрузки оставляет форму доступной и сохраняет введённый черновик. Замедленная загрузка сохраняет открытое меню/модальное окружение и восстанавливает фокус заголовка.
- Обычный маршрут очередь/дело/ручной разбор/источник: console ошибок/предупреждений нет.124 локальные ссылки и импорты проверены. Focus unit tests не заменяют полный аудит доступности.
- Новый первый frozen v2.0/v8:100/160 (62,5%), TP34 FP12 FN30 TN84, quoteErrors0. Первый отчёт и все 60 ошибок опубликованы неизменными. Второй независимый AI-разметчик согласился 160/160, κ1; человеческой разметки нет. Наборыv1–v7 открытые;99/100 наv7 не являются слепой оценкой.
-61 контекстная проверка,82 совместимости и все требуемые модульные наборы прошли. Первые историческиеv6/v7 воспроизведены отдельными frozen snapshot.
- Презентацияv2.0:8 слайдов, актуальные метрики, редактируемыйPPTX иPDF из точных 2xрендеров; все 8 просмотрены, финализатор 0 замечаний. В нативномPowerPoint не открывалась. Архивv1.8 сохранён.

Нельзя подтвердить 90/100: точность на реальном потоке, человеческий пилот, серверная работа команды и живая защита ещё не проверены. Эти ограничения не скрыты за новым дизайном.
