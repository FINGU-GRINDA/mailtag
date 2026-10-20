/**
 * @fingu-grinda/mailtag — 린다 메일 링크 UTM(mailtag) 한 벌.
 *
 * 메일을 내는 레포와 그 유입을 읽는 레포가 같은 규칙을 복사해 두면 한쪽만 고쳐져 집계가 갈린다.
 * 그래서 규칙을 이 패키지 하나에 두고 각 레포는 git 태그로 받는다. 외부 의존 0, Node·Bun·브라우저 공통.
 */
export { coldmailTagUrl, followupCampaign, followupTagUrl, isKstDateStamp, isMailKind, LEAD_MAIL_SOURCES, MAIL_KIND_SOURCE, MAIL_TAG_SAFE, mailTagUrl, PRODUCT_MAIL_SOURCES, UTM_ORDER, } from "./tag.js";
export { isLegacyPositionContent, isPositionTerm, MAIL_TERM_RULE, mailTerm, mailTermName, mailTermNameFromUrl, salesTermName, } from "./term.js";
export { checkEmailUtm, decodeEntities, mailTagErrors } from "./check.js";
export { companyUtmSlug, followupCompanySlug, kstDateStamp, toUtmSlug, WEBMAIL_LABELS } from "./slug.js";
export { followupInflow, isLeadMailUtm, isLegacyFollowupArrival, isLegacyFollowupContent, isSalesFollowupMail, LEGACY_LEAD_MAIL_SOURCES, } from "./read.js";
